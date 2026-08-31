const { execSync } = require('child_process');

class SelfHealingEngine {
  constructor() {
    this.rules = [
      {
        id: 'sh-001',
        name: 'Memory Pressure Recovery',
        pattern: /memory|heap|out of memory|oom|leak/i,
        severity: [4, 5],
        steps: [
          'Capture memory usage snapshot',
          'Identify top memory-consuming processes',
          'Clear cache and buffers if safe',
          'Restart affected service if needed',
          'Monitor memory recovery',
          'Alert if memory remains elevated'
        ]
      },
      {
        id: 'sh-002',
        name: 'Rate Limit Backoff',
        pattern: /rate.limit|429|throttl|quota|too many requests/i,
        severity: [2, 3, 4],
        steps: [
          'Implement exponential backoff',
          'Reduce request frequency',
          'Check rate limit headers',
          'Update retry configuration',
          'Verify API access restored',
          'Monitor for continued throttling'
        ]
      },
      {
        id: 'sh-003',
        name: 'Database Connection Recovery',
        pattern: /database|connection|timeout|pool|econnrefused/i,
        severity: [3, 4, 5],
        steps: [
          'Check database server status',
          'Verify network connectivity',
          'Test connection pool health',
          'Restart connection pool if needed',
          'Verify application reconnects',
          'Monitor connection stability'
        ]
      },
      {
        id: 'sh-004',
        name: 'SSL/TLS Recovery',
        pattern: /ssl|tls|certificate|expired|cert|handshake/i,
        severity: [4, 5],
        steps: [
          'Check certificate expiration',
          'Verify certificate chain',
          'Renew certificate if needed',
          'Reload service configuration',
          'Test HTTPS endpoints',
          'Monitor certificate validity'
        ]
      },
      {
        id: 'sh-005',
        name: 'Disk Space Recovery',
        pattern: /disk|space|capacity|no space|quota/i,
        severity: [3, 4, 5],
        steps: [
          'Check disk usage by directory',
          'Clear old logs and temp files',
          'Rotate active logs',
          'Clean up old backups',
          'Verify space reclaimed',
          'Set up disk space alerts'
        ]
      },
      {
        id: 'sh-006',
        name: 'Service Restart Recovery',
        pattern: /service|process|daemon|restart|crash|exited/i,
        severity: [3, 4, 5],
        steps: [
          'Check service status',
          'Review crash logs',
          'Verify dependencies',
          'Restart service',
          'Verify health after restart',
          'Monitor for stability'
        ]
      }
    ];

    this.history = [];
    this.maxHistory = 1000;
  }

  findRule(error) {
    const text = (error.message + ' ' + (error.source || '')).toLowerCase();
    return this.rules.find(r => {
      if (!r.severity.includes(error.severity)) return false;
      return r.pattern.test(text);
    }) || null;
  }

  async executeHealing(rule, error) {
    const healingId = 'heal-' + Date.now();
    const startTime = Date.now();
    const results = [];
    
    console.log('[self-heal] Executing:', rule.name, 'for', error.id);
    
    for (let i = 0; i < rule.steps.length; i++) {
      const step = rule.steps[i];
      const stepStart = Date.now();
      
      try {
        console.log('[self-heal] Step ' + (i + 1) + ': ' + step);
        
        // Simulate healing action with logging
        await new Promise(resolve => setTimeout(resolve, 500));
        
        results.push({
          step: i + 1,
          description: step,
          status: 'completed',
          duration: Date.now() - stepStart
        });
      } catch (err) {
        results.push({
          step: i + 1,
          description: step,
          status: 'failed',
          error: err.message,
          duration: Date.now() - stepStart
        });
        break;
      }
    }
    
    const execution = {
      healingId,
      ruleId: rule.id,
      ruleName: rule.name,
      errorId: error.id,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      steps: results,
      status: results.every(r => r.status === 'completed') ? 'completed' : 'partial'
    };
    
    this.history.push(execution);
    if (this.history.length > this.maxHistory) this.history.shift();
    
    return execution;
  }

  async monitorAndHeal(error) {
    const rule = this.findRule(error);
    if (!rule) return null;
    
    const execution = await this.executeHealing(rule, error);
    
    if (execution.status === 'completed') {
      console.log('[self-heal] Success:', rule.name);
    } else {
      console.log('[self-heal] Partial:', rule.name);
    }
    
    return execution;
  }

  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  getStats() {
    const total = this.history.length;
    const completed = this.history.filter(e => e.status === 'completed').length;
    return {
      total,
      completed,
      partial: total - completed,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

module.exports = { SelfHealingEngine };
