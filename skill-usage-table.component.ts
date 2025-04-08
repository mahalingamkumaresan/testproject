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
  readonly afterCutoff = '2024-11';

  private readonly relevantTechMap: Record<string, string> = {
    '.java': 'Java',
    '.ts': 'Angular',
    '.js': 'JavaScript',
    '.html': 'HTML',
    '.css': 'Angular',
    '.scss': 'Angular',
    '.jsx': 'React',
    '.tsx': 'React',
    '.xml': 'Spring',
    '.yml': 'Spring',
    '.yaml': 'Spring',
    '.properties': 'Spring',
    '.sql': 'Database',
    '.json': 'MongoDB',
    '.hql': 'Hadoop',
    '.groovy': 'Jenkins',
    'pom.xml': 'Maven',
    'build.gradle': 'Gradle',
    'Dockerfile': 'IAAS',
    'Jenkinsfile': 'Jenkins',
    '.spec.ts': 'Jest',
    '.test.ts': 'Jest'
  };

  ngOnChanges(): void {
    console.log('Live data chart load triggered...');
    if (this.stubMode) {
      console.log('Stub mode enabled. Loading dummy chart data...');
      this.loadStubCharts();
      return;
    }

    if (!this.commitData?.length) {
      console.warn('No commit data provided!');
      return;
    }

    console.log('Commit data received:', this.commitData.length);
    const techSet = new Set<string>();
    const traineeMap: Record<string, any> = {};

    for (const commit of this.commitData) {
      const email = commit.AuthorEmail?.toLowerCase();
      const month = commit.Month;
      const fileList: string[] = commit.FileName?.split(',').map((f: string) => f.trim().toLowerCase()) || [];

      if (!email || !month) continue;

      let phase: 'before' | 'during' | 'after';
      if (month < this.trainingStart) {
        phase = 'before';
      } else if (month <= this.trainingEnd) {
        phase = 'during';
      } else if (this.useFullAfterPeriod || month <= this.afterCutoff) {
        phase = 'after';
      } else {
        continue;
      }

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
      result[`total_before`] = entry.total.before || 0;
      result[`total_during`] = entry.total.during || 0;
      result[`total_after`] = entry.total.after || 0;
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

  loadStubCharts() {
    const categories = ['Java', 'Angular', 'Spring', 'MongoDB'];
    const before = [20, 10, 5, 2];
    const during = [40, 25, 10, 5];
    const after = [60, 50, 25, 15];
    const delta = after.map((v, i) => v - before[i]);
    const beforeTotal = before.reduce((a, b) => a + b, 0);
    const afterTotal = after.reduce((a, b) => a + b, 0);
    const beforePercent = before.map(v => +(v / beforeTotal * 100).toFixed(2));
    const afterPercent = after.map(v => +(v / afterTotal * 100).toFixed(2));

    this.generateCharts(categories, before, during, after, delta, beforePercent, afterPercent);
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
    const delta = categories.map((_, i) => after[i] - before[i]);
    const beforeTotal = before.reduce((a, b) => a + b, 0);
    const afterTotal = after.reduce((a, b) => a + b, 0);
    const beforePercent = before.map(v => +(v / beforeTotal * 100).toFixed(2));
    const afterPercent = after.map(v => +(v / afterTotal * 100).toFixed(2));

    console.log('Chart Categories:', categories);
    console.log('Before:', before);
    console.log('After:', after);
    console.log('Delta:', delta);

    this.chartOptionsStacked = JSON.parse(JSON.stringify({
      chart: { type: 'column', height: 500 },
      title: { text: 'Skill Usage per Phase (Stacked)', align: 'left' },
      xAxis: { categories },
      yAxis: { min: 0, title: { text: 'Usage %' } },
      tooltip: { shared: true, valueSuffix: '%' },
      plotOptions: { column: { stacking: 'normal', dataLabels: { enabled: true } } },
      series: [
        { name: 'Before', data: before, type: 'column' },
        { name: 'During', data: during, type: 'column' },
        { name: 'After', data: after, type: 'column' }
      ]
    }));

    this.chartOptionsGrouped = JSON.parse(JSON.stringify({
      chart: { type: 'column', height: 500 },
      title: { text: 'Skill Usage per Phase (Grouped)', align: 'left' },
      xAxis: { categories },
      yAxis: { min: 0, title: { text: 'Usage %' } },
      tooltip: { shared: true, valueSuffix: '%' },
      plotOptions: { column: { grouping: true, dataLabels: { enabled: true } } },
      series: [
        { name: 'Before', data: before, type: 'column' },
        { name: 'During', data: during, type: 'column' },
        { name: 'After', data: after, type: 'column' }
      ]
    }));

    this.chartOptionsDelta = JSON.parse(JSON.stringify({
      chart: { type: 'bar', height: 500 },
      title: { text: 'Skill Uptick (After - Before)', align: 'left' },
      xAxis: { categories },
      yAxis: { title: { text: 'Uptick %' } },
      tooltip: { valueSuffix: '%' },
      plotOptions: {
        bar: {
          dataLabels: { enabled: true, format: '{point.y:.0f}%' }
        }
      },
      series: [{ name: 'Uptick', data: delta, type: 'bar' }]
    }));

    this.chartOptionsRadar = JSON.parse(JSON.stringify({
      chart: { polar: true, type: 'line', height: 500 },
      title: { text: 'Skill Mix Comparison (Radar)', align: 'left' },
      xAxis: { categories, tickmarkPlacement: 'on', lineWidth: 0 },
      yAxis: { gridLineInterpolation: 'polygon', min: 0, title: { text: '% Mix' } },
      tooltip: { shared: true, pointFormat: '<span>{series.name}</span>: <b>{point.y}%</b><br/>' },
      series: [
        { name: 'Before', data: beforePercent, type: 'line' },
        { name: 'After', data: afterPercent, type: 'line' }
      ]
    }));
  }
}
