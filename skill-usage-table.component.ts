import { Component, Input, OnChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import { BBdataService } from '../../../services/BBData.service';

@Component({
  selector: 'app-skill-usage-table',
  templateUrl: './app-skill-usage-table.component.html',
  styleUrls: ['./app-skill-usage-table.component.css']
})
export class SkillUsageTableComponent implements OnChanges {
  @Input() commitData: any[] = [];
  @Input() stubMode = false;
  @Input() useFullAfterPeriod = false;

  processedData: any[] = [];
  allTechnologies: string[] = [];

  Highcharts: typeof Highcharts = Highcharts;
  chartOptionsRadar: Highcharts.Options = {};

  readonly trainingStart = '2024-04';
  readonly trainingEnd = '2024-07';
  readonly afterCutoff = '2024-11';

  private readonly relevantTechMap: Record<string, string> = {
    '.java': 'Java', '.ts': 'Angular', '.js': 'JavaScript', '.html': 'HTML', '.css': 'Angular',
    '.jsx': 'React', '.tsx': 'React', '.xml': 'Spring', '.yml': 'Spring', '.properties': 'Spring',
    '.sql': 'Database', '.json': 'MongoDB', '.spec.ts': 'Jest', '.test.ts': 'Jest',
    '.gradle': 'Gradle', '.dockerfile': 'IAAS', 'pom.xml': 'Maven'
  };

  constructor(private bbdataService: BBdataService) {}

  ngOnChanges(): void {
    console.log('Live data chart load triggered...');
    if (this.stubMode) {
      console.log('Stub mode enabled. Loading dummy chart data...');
      this.loadStubCharts();
      return;
    }

    if (!this.commitData?.length) {
      this.bbdataService.bbdata$.subscribe(data => {
        if (data) {
          this.commitData = data;
        }
      });
    }

    console.log('Commit data received:', this.commitData.length);
    const techSet = new Set<string>();
    const traineeMap: Record<string, any> = {};

    for (const commit of this.commitData) {
      const email = commit.AuthorEmail?.toLowerCase();
      const month = commit.Month;
      const fileList: string[] = commit.FileName?.split('.').map(f => f.trim().toLowerCase()) || [];
      if (!email || !month) continue;

      let phase = '';
      if (month < this.trainingStart) phase = 'before';
      else if (month < this.trainingEnd) phase = 'during';
      else if (this.useFullAfterPeriod || month <= this.afterCutoff) phase = 'after';
      else continue;

      const techsInCommit = new Set<string>();
      for (const ext in this.relevantTechMap) {
        if (fileList.includes(ext)) {
          const tech = this.relevantTechMap[ext].toLowerCase();
          techsInCommit.add(tech);
        }
      }

      if (!techsInCommit.size) continue;

      if (!traineeMap[email]) {
        traineeMap[email] = { trainee: email, total: { before: 0, during: 0, after: 0 }, data: {} };
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
    console.log('Detected technologies:', this.allTechnologies);

    this.processedData = Object.values(traineeMap).map((entry: any) => {
      const result: any = { trainee: entry.trainee };
      this.allTechnologies.forEach(tech => {
        ['before', 'during', 'after'].forEach(phase => {
          const count = entry.data[tech]?.[phase] || 0;
          const total = entry.total[phase] || 1;
          result[`${tech}_${phase}`] = Math.round((count / total) * 100);
        });
      });
      result.total_before = entry.total.before || 0;
      result.total_during = entry.total.during || 0;
      result.total_after = entry.total.after || 0;
      return result;
    });

    console.log('Processed rows:', this.processedData.length);
    this.prepareCharts();
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

  prepareCharts(): void {
    const totals: Record<string, { before: number, during: number, after: number }> = {};
    this.processedData.forEach(row => {
      this.allTechnologies.forEach(tech => {
        if (!totals[tech]) totals[tech] = { before: 0, during: 0, after: 0 };
        totals[tech].before += row[`${tech}_before`] || 0;
        totals[tech].during += row[`${tech}_during`] || 0;
        totals[tech].after += row[`${tech}_after`] || 0;
      });
    });

    const categories = Object.keys(totals);
    const before = categories.map(tech => totals[tech].before);
    const during = categories.map(tech => totals[tech].during);
    const after = categories.map(tech => totals[tech].after);

    const beforeTotal = before.reduce((a, b) => a + b, 0);
    const afterTotal = after.reduce((a, b) => a + b, 0);
    const beforePercent = before.map(v => +((v / beforeTotal) * 100).toFixed(2));
    const duringPercent = during.map(v => +((v / beforeTotal) * 100).toFixed(2));
    const afterPercent = after.map(v => +((v / afterTotal) * 100).toFixed(2));

    this.chartOptionsRadar = {
      chart: { polar: true, type: 'line', height: 500 },
      title: { text: 'Skill Mix Comparison (Radar)', align: 'left' },
      xAxis: { categories, tickmarkPlacement: 'on', lineWidth: 0 },
      yAxis: {
        gridLineInterpolation: 'polygon',
        min: 0,
        title: { text: '% Mix' }
      },
      tooltip: {
        shared: true,
        formatter: function () {
          return `<span style="font-weight:bold">${this.x}</span><br/>` +
            this.points!.map(p => `<span>${p.series.name}</span>: <b>${p.y}%</b><br/>`).join('');
        }
      },
      series: [
        { name: 'Before', data: beforePercent, type: 'line', pointPlacement: 'on' },
        { name: 'During', data: duringPercent, type: 'line', pointPlacement: 'on' },
        { name: 'After', data: afterPercent, type: 'line', pointPlacement: 'on' }
      ]
    };
  }

  loadStubCharts(): void {
    this.chartOptionsRadar = {
      chart: { polar: true, type: 'line', height: 500 },
      title: { text: 'Skill Mix Comparison (Radar)', align: 'left' },
      xAxis: { categories: ['Java', 'Angular', 'Spring', 'MongoDB'], tickmarkPlacement: 'on', lineWidth: 0 },
      yAxis: {
        gridLineInterpolation: 'polygon',
        min: 0,
        title: { text: '% Mix' }
      },
      series: [
        { name: 'Before', data: [30, 20, 25, 15], type: 'line', pointPlacement: 'on' },
        { name: 'During', data: [35, 30, 28, 20], type: 'line', pointPlacement: 'on' },
        { name: 'After', data: [40, 33, 30, 25], type: 'line', pointPlacement: 'on' }
      ]
    };
  }
}
