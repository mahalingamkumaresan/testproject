// File: skill-usage-table.component.ts

import { Component, Input, OnChanges } from '@angular/core';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-skill-usage-table',
  templateUrl: './skill-usage-table.component.html',
  styleUrls: ['./skill-usage-table.component.css']
})
export class SkillUsageTableComponent implements OnChanges {
  @Input() commitData: any[] = [];
  @Input() stubMode = false;
  @Input() useFullAfterPeriod = false;

  processedData: any[] = [];
  allTechnologies: string[] = [];
  Highcharts: typeof Highcharts = Highcharts;
  chartOptionsStacked: Highcharts.Options = {};
  chartOptionsGrouped: Highcharts.Options = {};
  chartOptionsDelta: Highcharts.Options = {};
  chartOptionsRadar: Highcharts.Options = {};

  readonly trainingStart = '2024-04';
  readonly trainingEnd = '2024-07';

  private readonly relevantTechMap: Record<string, string> = {
    '.java': 'Java', '.ts': 'Angular', '.js': 'JavaScript',
    '.html': 'HTML', '.css': 'Angular', '.scss': 'Angular',
    '.jsx': 'React', '.tsx': 'React', '.xml': 'Spring',
    '.yml': 'Spring', '.yaml': 'Spring', '.properties': 'Spring',
    '.sql': 'Database', '.json': 'MongoDB', '.hql': 'Hadoop',
    '.groovy': 'Jenkins', 'pom.xml': 'Maven', 'build.gradle': 'Gradle',
    'Dockerfile': 'IAAS', 'Jenkinsfile': 'Jenkins',
    '.spec.ts': 'Jest', '.test.ts': 'Jest'
  };

  ngOnChanges(): void {
    setTimeout(() => {
      if (this.stubMode) {
        this.loadStubCharts();
        return;
      }

      if (!this.commitData?.length) return;

      const techSet = new Set<string>();
      const traineeMap: Record<string, any> = {};

      for (const commit of this.commitData) {
        const email = commit.AuthorEmail?.toLowerCase();
        const month = commit.Month;
        const fileList = commit.FileName?.split(',').map((f: string) => f.trim().toLowerCase()) || [];

        if (!email || !month) continue;

        const phase: 'before' | 'during' | 'after' =
          month < this.trainingStart ? 'before' :
          month <= this.trainingEnd ? 'during' :
          (this.useFullAfterPeriod || month <= '2024-11' ? 'after' : null);

        if (!phase) continue;

        const techsInCommit = new Set<string>();
        for (const file of fileList) {
          for (const ext in this.relevantTechMap) {
            if (file.endsWith(ext)) {
              const tech = this.relevantTechMap[ext].toLowerCase();
              techsInCommit.add(tech);
            }
          }
        }

        if (!techsInCommit.size) continue;

        if (!traineeMap[email]) {
          traineeMap[email] = {
            trainee: email,
            total: { before: 0, during: 0, after: 0 },
            data: {}
          };
        }

        traineeMap[email].total[phase]++;

        for (const tech of techsInCommit) {
          techSet.add(tech);
          if (!traineeMap[email].data[tech]) {
            traineeMap[email].data[tech] = { before: 0, during: 0, after: 0 };
          }
          traineeMap[email].data[tech][phase]++;
        }
      }

      this.allTechnologies = Array.from(techSet).sort();

      this.processedData = Object.values(traineeMap).map((entry: any) => {
        const result: any = { trainee: entry.trainee };
        this.allTechnologies.forEach(tech => {
          ['before', 'during', 'after'].forEach(phase => {
            const count = entry.data[tech]?.[phase] || 0;
            const total = entry.total[phase] || 1;
            result[`${tech}_${phase}`] = Math.round((count / total) * 100);
          });
          result[`total_before`] = entry.total.before;
          result[`total_during`] = entry.total.during;
          result[`total_after`] = entry.total.after;
        });
        return result;
      });

      this.prepareCharts();
    }, 2000); // Introduce 2-second delay
  }

  hasUptick(row: any, tech: string, phase: 'during' | 'after'): boolean {
    const before = row[`${tech}_before`] || 0;
    const during = row[`${tech}_during`] || 0;
    const after = row[`${tech}_after`] || 0;
    return phase === 'during' ? during > before : after > during || after > before;
  }

  getTooltip(row: any, tech: string, phase: 'before' | 'during' | 'after'): string {
    const percentage = row[`${tech}_${phase}`] || 0;
    const total = row[`total_${phase}`] || 0;
    const count = Math.round((percentage / 100) * total);

    let change = '';
    if (phase !== 'before') {
      const prevPhase = phase === 'during' ? 'before' : 'during';
      const prev = row[`${tech}_${prevPhase}`] || 0;
      const delta = percentage - prev;
      const symbol = delta > 0 ? '+' : '';
      change = `\nChange from ${prevPhase}: ${symbol}${delta}%`;
    }

    return `${tech.toUpperCase()}: ${percentage}% of commits\nRaw count: ${count} of ${total}${change}`;
  }

  // loadStubCharts() and prepareCharts() remain as previously shared...
}
