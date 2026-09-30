import {
  DNSRecordType,
  ScanResult,
  ScanOverallStatus,
  GLOBAL_RESOLVER_VANTAGES,
  ResolverQueryResult,
  RecordPropagationSummary,
  Finding,
  SecurityScorecard
} from '../shared/index.js';
import { DNSSyntaxValidation } from './validation/dnsSyntaxValidation.js';
import { NormalizationService } from './dns/normalizationService.js';
import { authoritativeService } from './dns/authoritativeService.js';
import { dnsResolverService } from './dns/dnsResolverService.js';
import { PropagationEngine } from './propagation/propagationEngine.js';
import { SPFValidation } from './validation/spfValidation.js';
import { DMARCValidation } from './validation/dmarcValidation.js';
import { MXValidation } from './validation/mxValidation.js';
import { CNAMEValidation } from './validation/cnameValidation.js';
import { MisconfigurationDetectionService } from './misconfiguration/misconfigurationDetectionService.js';
import { ThreatIntelService } from './threat/threatIntelService.js';
import { DEMO_SCENARIOS } from './demo/fixtureData.js';
import { Scan } from '../models/Scan.js';
import { DNSRecord } from '../models/DNSRecord.js';
import { ResolverResult } from '../models/ResolverResult.js';
import { Finding as FindingModel } from '../models/Finding.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export interface ScanStageUpdate {
  stage: string;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  detail?: string;
}

export type StageCallback = (update: ScanStageUpdate) => void;

export class ScanOrchestrator {
  public static async executeScan(
    rawDomain: string,
    requestedRecordTypes: DNSRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'],
    options: {
      isDemo?: boolean;
      onStageUpdate?: StageCallback;
      scanType?: 'manual' | 'scheduled' | 'demo';
    } = {}
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const updateStage = (stage: string, label: string, status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED', detail?: string) => {
      if (options.onStageUpdate) {
        options.onStageUpdate({ stage, label, status, detail });
      }
    };

    // Stage 1: Domain Validation
    updateStage('VALIDATE_DOMAIN', 'Validating domain syntax', 'RUNNING');
    const cleanedDomain = DNSSyntaxValidation.cleanDomainInput(rawDomain);
    const domainValidation = DNSSyntaxValidation.isValidDomain(cleanedDomain);
    if (!domainValidation.valid) {
      updateStage('VALIDATE_DOMAIN', 'Domain syntax invalid', 'FAILED', domainValidation.reason);
      throw new Error(domainValidation.reason || 'Invalid domain syntax.');
    }
    const domain = NormalizationService.normalizeDomain(cleanedDomain);
    updateStage('VALIDATE_DOMAIN', 'Domain validated successfully', 'COMPLETED', domain);

    // Check Demo Mode: strictly only when isDemo is explicitly true
    if (options.isDemo) {
      updateStage('DEMO_MODE', 'Generating demo fixture report', 'RUNNING');
      const fixture = DEMO_SCENARIOS[domain] || DEMO_SCENARIOS['healthy.acme-cloud.io'];
      const demoId = new mongoose.Types.ObjectId();

      const demoResolverResults = (fixture.resolverResults as any[] || []).map((r) => ({
        ...r,
        evidenceTag: 'DEMO_DATA' as const,
        networkType: 'anycast' as const
      }));

      const demoResult: ScanResult = {
        id: demoId.toString(),
        domain: domain,
        normalizedDomain: domain,
        recordTypes: requestedRecordTypes,
        isDemo: true,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        overallStatus: fixture.overallStatus || 'HEALTHY',
        propagationPercentage: fixture.propagationPercentage || 100,
        resolverAgreement: fixture.resolverAgreement || 14,
        totalResolversQueried: 14,
        authoritativeSummary: {
          ...(fixture.authoritativeSummary as any),
          isLive: false,
          primaryNameserver: (fixture.authoritativeSummary as any)?.nameservers?.[0]?.hostname || 'Demo Nameserver',
          nameserverIp: (fixture.authoritativeSummary as any)?.nameservers?.[0]?.ipAddresses?.[0] || '198.51.100.1'
        },
        recordPropagation: fixture.recordPropagation as any,
        records: (fixture.records as any) || [],
        resolverResults: demoResolverResults,
        findings: (fixture.findings as any) || [],
        securityScorecard: fixture.securityScorecard as any
      };

      // Persist demo scan in MongoDB if DB is connected
      try {
        await Scan.create({
          _id: demoId,
          domain: demoResult.domain,
          normalizedDomain: demoResult.normalizedDomain,
          recordTypes: demoResult.recordTypes,
          scanType: 'demo',
          isDemo: true,
          startedAt: new Date(demoResult.startedAt),
          completedAt: new Date(demoResult.completedAt),
          status: demoResult.overallStatus,
          propagationPercentage: demoResult.propagationPercentage,
          resolverAgreement: demoResult.resolverAgreement,
          authoritativeNameservers: demoResult.authoritativeSummary.nameservers,
          authoritativeSummary: demoResult.authoritativeSummary,
          recordPropagation: demoResult.recordPropagation,
          securityScorecard: demoResult.securityScorecard,
          durationMs: demoResult.durationMs
        });
      } catch (err: any) {
        logger.debug(`Could not save demo scan to DB: ${err.message}`);
      }

      updateStage('DEMO_MODE', 'Demo scan completed', 'COMPLETED');
      return demoResult;
    }

    // Stage 2: Discover Authoritative Nameservers & Query Canonical Records
    updateStage('DISCOVER_AUTH', 'Discovering authoritative nameservers & SOA', 'RUNNING');
    const authoritativeSummary = await authoritativeService.inspectAuthoritativeServers(
      domain,
      requestedRecordTypes
    );
    authoritativeSummary.isLive = true;
    updateStage(
      'DISCOVER_AUTH',
      `Authoritative NS verified (${authoritativeSummary.nameservers.length} nameservers found)`,
      'COMPLETED'
    );

    // Stage 3: Query Global Recursive Resolver Vantage Points
    updateStage('QUERY_RESOLVERS', 'Querying 14 global resolver vantage points', 'RUNNING');
    const allResolverResults: ResolverQueryResult[] = [];

    // Query primary record type (A record) or requested types across all vantages
    const typesToQuery = requestedRecordTypes.filter((t) => t !== 'SOA' && t !== 'SPF' && t !== 'DMARC');
    const primaryRecordType: DNSRecordType = typesToQuery.length === 1 ? typesToQuery[0] : (typesToQuery.includes('A') ? 'A' : typesToQuery[0] || 'A');

    const resolverPromises = GLOBAL_RESOLVER_VANTAGES.map(async (vantage) => {
      const queryRes = await dnsResolverService.query(
        domain,
        primaryRecordType,
        vantage.resolverIp,
        {
          transport: vantage.transport || 'UDP',
          dohEndpoint: vantage.dohEndpoint
        }
      );
      const resItem: ResolverQueryResult = {
        resolverId: vantage.id,
        provider: vantage.provider,
        resolverIp: vantage.resolverIp,
        locationLabel: vantage.locationLabel,
        country: vantage.country,
        continent: vantage.continent,
        latitude: vantage.latitude,
        longitude: vantage.longitude,
        recordType: primaryRecordType,
        status: queryRes.status,
        answers: queryRes.answers,
        normalizedAnswers: queryRes.answers,
        ttl: queryRes.ttl,
        responseTimeMs: queryRes.responseTimeMs,
        error: queryRes.error,
        checkedAt: new Date().toISOString(),
        evidenceTag: 'LIVE_QUERY',
        networkType: vantage.networkType || 'anycast',
        transport: queryRes.transport,
        rcode: queryRes.rcode,
        flags: queryRes.flags,
        source: 'LIVE_DNS'
      };
      return resItem;
    });

    const settledResults = await Promise.allSettled(resolverPromises);
    for (const r of settledResults) {
      if (r.status === 'fulfilled') {
        allResolverResults.push(r.value);
      }
    }
    updateStage('QUERY_RESOLVERS', 'All resolver vantages responded', 'COMPLETED');

    // Stage 4: Propagation Calculation & Normalization
    updateStage('CALCULATE_PROPAGATION', 'Normalizing responses & calculating propagation', 'RUNNING');
    const canonicalPrimary = authoritativeSummary.canonicalRecords[primaryRecordType] || [];
    const { summary: propagationSummary, evaluatedResults } = PropagationEngine.calculateRecordPropagation(
      primaryRecordType,
      canonicalPrimary,
      allResolverResults,
      authoritativeSummary.source
    );

    const recordPropagation: Record<string, RecordPropagationSummary> = {
      [primaryRecordType]: propagationSummary
    };
    updateStage('CALCULATE_PROPAGATION', `Propagation: ${propagationSummary.propagationPercentage}%`, 'COMPLETED');

    // Stage 5: Security & Misconfiguration Analysis (SPF, DMARC, MX, CNAME)
    updateStage('SECURITY_CHECKS', 'Validating SPF, DMARC, MX, and Dangling CNAMEs', 'RUNNING');
    const allFindings: Finding[] = [];

    // Authoritative consistency checks
    const authFindings = MisconfigurationDetectionService.analyzeAuthoritativeConsistency(authoritativeSummary);
    allFindings.push(...authFindings);

    // Propagation convergence checks
    const propFindings = MisconfigurationDetectionService.analyzePropagationConvergence(
      evaluatedResults,
      propagationSummary.propagationPercentage
    );
    allFindings.push(...propFindings);

    // TTL analysis
    const primaryTtl = authoritativeSummary.recordTtvs?.[primaryRecordType];
    const ttlFindings = MisconfigurationDetectionService.analyzeTTLAbnormalities(primaryTtl);
    allFindings.push(...ttlFindings);

    // SPF Validation (from authoritative TXT or queried TXT)
    let txtRecords = authoritativeSummary.canonicalRecords['TXT'] || [];
    if (txtRecords.length === 0) {
      const txtQuery = await dnsResolverService.query(domain, 'TXT', '8.8.8.8');
      txtRecords = txtQuery.answers;
    }
    const spfResult = SPFValidation.validate(txtRecords);
    allFindings.push(...spfResult.findings);

    // DMARC Validation
    const dmarcResult = await DMARCValidation.queryAndValidate(domain);
    allFindings.push(...dmarcResult.findings);

    // MX Validation
    let mxRecords = authoritativeSummary.canonicalRecords['MX'] || [];
    if (mxRecords.length === 0) {
      const mxQuery = await dnsResolverService.query(domain, 'MX', '8.8.8.8');
      mxRecords = mxQuery.answers;
    }
    const hasA = (authoritativeSummary.canonicalRecords['A'] || []).length > 0;
    const mxResult = await MXValidation.validate(domain, mxRecords, hasA);
    allFindings.push(...mxResult.findings);

    // CNAME & Dangling target validation
    let cnameRecords = authoritativeSummary.canonicalRecords['CNAME'] || [];
    if (cnameRecords.length === 0) {
      const cnameQuery = await dnsResolverService.query(domain, 'CNAME', '8.8.8.8');
      cnameRecords = cnameQuery.answers;
    }
    const cnameResult = await CNAMEValidation.validate(domain, cnameRecords);
    allFindings.push(...cnameResult.findings);

    // Cross-reference with DNS Threat Intelligence Telemetry
    try {
      const threatFinding = await ThreatIntelService.checkDomainThreat(domain);
      if (threatFinding) {
        allFindings.unshift(threatFinding);
      }
    } catch (threatErr) {
      // Non-blocking for threat lookup
    }

    updateStage('SECURITY_CHECKS', 'Security & misconfiguration checks completed', 'COMPLETED');

    // Assemble Records Table
    const recordsList: ScanResult['records'] = [];
    for (const type of requestedRecordTypes) {
      const vals = authoritativeSummary.canonicalRecords[type] || [];
      if (vals.length > 0) {
        recordsList.push({
          type,
          name: domain,
          values: vals,
          ttl: authoritativeSummary.recordTtvs?.[type] || 300,
          source: 'authoritative',
          propagationPercentage: type === primaryRecordType ? propagationSummary.propagationPercentage : 100,
          status: type === primaryRecordType && propagationSummary.propagationPercentage < 90 ? 'DIFFERENT' : 'MATCH'
        });
      } else if (authoritativeSummary.source === 'reference_unavailable') {
        recordsList.push({
          type,
          name: domain,
          values: ['AUTHORITATIVE REFERENCE UNAVAILABLE'],
          ttl: 0,
          source: 'reference_unavailable' as any,
          propagationPercentage: 0,
          status: 'DIFFERENT'
        });
      }
    }

    // Determine Overall Status
    const hasCritical = allFindings.some((f) => f.severity === 'CRITICAL');
    const hasWarning = allFindings.some((f) => f.severity === 'WARNING');
    let overallStatus: ScanOverallStatus = 'HEALTHY';

    if (hasCritical) {
      overallStatus = 'ERROR';
    } else if (authoritativeSummary.source === 'reference_unavailable') {
      overallStatus = 'WARNING';
    } else if (propagationSummary.propagationPercentage < 90) {
      overallStatus = 'PROPAGATING';
    } else if (hasWarning) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'HEALTHY';
    }

    const durationMs = Date.now() - startTime;
    const scanId = new mongoose.Types.ObjectId();

    const securityScorecard: SecurityScorecard = {
      spf: {
        status: spfResult.status,
        record: spfResult.records[0],
        details: spfResult.details,
        allMechanism: spfResult.allMechanism,
        lookupCount: spfResult.lookupCount
      },
      dmarc: {
        status: dmarcResult.status,
        record: dmarcResult.records[0],
        policy: dmarcResult.policy,
        rua: dmarcResult.rua,
        details: dmarcResult.details
      },
      mx: {
        status: mxResult.status,
        count: mxResult.records.length,
        details: mxResult.details,
        records: mxResult.records
      },
      cname: {
        status: cnameResult.status,
        dangling: cnameResult.dangling,
        target: cnameResult.target,
        details: cnameResult.details
      }
    };

    const finalResult: ScanResult = {
      id: scanId.toString(),
      domain,
      normalizedDomain: domain,
      recordTypes: requestedRecordTypes,
      isDemo: false,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      overallStatus,
      propagationPercentage: propagationSummary.propagationPercentage,
      resolverAgreement: propagationSummary.matchingResolvers,
      totalResolversQueried: propagationSummary.totalResolvers,
      authoritativeSummary,
      recordPropagation,
      records: recordsList,
      resolverResults: evaluatedResults,
      findings: allFindings,
      securityScorecard
    };

    // Stage 6: MongoDB Persistence
    updateStage('PERSISTENCE', 'Saving scan results & telemetry to MongoDB', 'RUNNING');
    try {
      await Scan.create({
        _id: scanId,
        domain,
        normalizedDomain: domain,
        recordTypes: requestedRecordTypes,
        scanType: options.scanType || 'manual',
        isDemo: false,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        status: overallStatus,
        propagationPercentage: propagationSummary.propagationPercentage,
        resolverAgreement: propagationSummary.matchingResolvers,
        authoritativeNameservers: authoritativeSummary.nameservers,
        authoritativeSummary,
        recordPropagation,
        securityScorecard,
        durationMs
      });

      // Save records
      if (recordsList.length > 0) {
        await DNSRecord.insertMany(
          recordsList.map((rec) => ({
            scanId,
            domain,
            name: rec.name,
            type: rec.type,
            values: rec.values,
            ttl: rec.ttl,
            source: rec.source,
            propagationPercentage: rec.propagationPercentage,
            status: rec.status
          }))
        );
      }

      // Save resolver results
      if (evaluatedResults.length > 0) {
        await ResolverResult.insertMany(
          evaluatedResults.map((r) => ({
            scanId,
            domain,
            resolverId: r.resolverId,
            provider: r.provider,
            resolverIp: r.resolverIp,
            locationLabel: r.locationLabel,
            country: r.country,
            continent: r.continent,
            latitude: r.latitude,
            longitude: r.longitude,
            recordType: r.recordType,
            status: r.status,
            answers: r.answers,
            normalizedAnswers: r.normalizedAnswers,
            ttl: r.ttl,
            responseTimeMs: r.responseTimeMs,
            error: r.error,
            matchesCanonical: r.matchesCanonical,
            networkType: r.networkType,
            evidenceTag: r.evidenceTag,
            transport: r.transport || 'UDP',
            rcode: r.rcode || 'NOERROR',
            flags: r.flags,
            source: r.source || 'LIVE_DNS',
            isLive: true,
            whyDifferent: r.whyDifferent,
            checkedAt: new Date(r.checkedAt)
          }))
        );
      }

      // Save findings
      if (allFindings.length > 0) {
        await FindingModel.insertMany(
          allFindings.map((f) => ({
            scanId,
            severity: f.severity,
            category: f.category,
            title: f.title,
            description: f.description,
            recordType: f.recordType,
            evidence: f.evidence,
            recommendation: f.recommendation
          }))
        );
      }
      updateStage('PERSISTENCE', 'Scan persisted to database', 'COMPLETED');
    } catch (dbErr: any) {
      logger.error(`MongoDB persistence error: ${dbErr.message}`);
      updateStage('PERSISTENCE', 'Database write warning', 'COMPLETED', dbErr.message);
    }

    return finalResult;
  }
}
