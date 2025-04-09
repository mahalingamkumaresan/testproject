import { Component, Input, OnChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import ExportingModule from 'highcharts/modules/exporting';

ExportingModule(Highcharts);

@Component({
  selector: 'app-skill-usage-table',
  templateUrl: './skill-usage-table.component.html',
  styleUrls: ['./skill-usage-table.component.css']
})
export class SkillUsageTableComponent implements OnChanges {
  @Input() commitData: any[] = [];
  @Input() useFullAfterPeriod = false;

  Highcharts: typeof Highcharts = Highcharts;
  chartOptionsRadar: Highcharts.Options = {};

  isLoading = true;
  processedData: any[] = [];
  allTechnologies: string[] = [];
  chartCategories: string[] = [];
  beforeRadar: number[] = [];
  duringRadar: number[] = [];
  afterRadar: number[] = [];

  readonly trainingStart = '2024-04';
  readonly trainingEnd = '2024-07';

  ngOnChanges(): void {
    if (!this.commitData?.length) return;

    this.isLoading = true;
    setTimeout(() => {
      this.processData();
      this.prepareRadarChart();
      this.isLoading = false;
    });
  }

  processData(): void {
    const techMap: Record<string, { before: number; during: number; after: number; total: number }> = {};
    const uniqueTechs = new Set<string>();
    const authors = new Set<string>();

    this.commitData.forEach(commit => {
      const month = commit.Month;
      const techList = (commit.Technology || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const totalCommits = Number(commit.TotalCommits || 1);

      techList.forEach(tech => {
        uniqueTechs.add(tech);
        if (!techMap[tech]) {
          techMap[tech] = { before: 0, during: 0, after: 0, total: 0 };
        }

        if (month < this.trainingStart) techMap[tech].before += totalCommits;
        else if (month <= this.trainingEnd) techMap[tech].during += totalCommits;
        else if (!this.useFullAfterPeriod || month <= '2024-11') techMap[tech].after += totalCommits;

        techMap[tech].total += totalCommits;
      });

      authors.add(commit.AuthorEmail);
    });

    this.allTechnologies = Array.from(uniqueTechs).sort();
    this.chartCategories = [...this.allTechnologies];

    this.beforeRadar = this.allTechnologies.map(t =>
      this.percent(techMap[t]?.before, techMap[t]?.total)
    );
    this.duringRadar = this.allTechnologies.map(t =>
      this.percent(techMap[t]?.during, techMap[t]?.total)
    );
    this.afterRadar = this.allTechnologies.map(t =>
      this.percent(techMap[t]?.after, techMap[t]?.total)
    );

    this.processedData = Array.from(authors).map(email => {
      const rows = this.commitData.filter(c => c.AuthorEmail === email);
      const total = rows.reduce((sum, r) => sum + (Number(r.TotalCommits) || 1), 0);
      const row: any = { trainee: email };

      this.allTechnologies.forEach(tech => {
        const before = rows.filter(r => r.Month < this.trainingStart && r.Technology?.includes(tech)).length;
        const during = rows.filter(r => r.Month >= this.trainingStart && r.Month <= this.trainingEnd && r.Technology?.includes(tech)).length;
        const after = rows.filter(r => r.Month > this.trainingEnd && (!this.useFullAfterPeriod || r.Month <= '2025-03') && r.Technology?.includes(tech)).length;

        row[`${tech}_before`] = this.percent(before, total);
        row[`${tech}_during`] = this.percent(during, total);
        row[`${tech}_after`] = this.percent(after, total);
      });

      return row;
    });
  }

  prepareRadarChart(): void {
    this.chartOptionsRadar = {
      chart: {
        polar: true,
        type: 'line',
        height: 500
      },
      title: {
        text: 'Skill Mix Comparison (Radar)',
        align: 'center'
      },
      xAxis: {
        categories: this.chartCategories,
        tickmarkPlacement: 'on',
        lineWidth: 0
      },
      yAxis: {
        gridLineInterpolation: 'polygon',
        lineWidth: 0,
        min: 0,
        title: {
          text: 'Usage %'
        }
      },
      tooltip: {
        shared: true,
        pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y:.1f}%</b><br/>'
      },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal'
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['viewFullscreen', 'downloadPNG', 'downloadJPEG']
          }
        }
      },
      credits: {
        enabled: false
      },
      series: [
        {
          name: 'Before',
          data: this.beforeRadar,
          pointPlacement: 'on'
        },
        {
          name: 'During',
          data: this.duringRadar,
          pointPlacement: 'on'
        },
        {
          name: 'After',
          data: this.afterRadar,
          pointPlacement: 'on'
        }
      ]
    };
  }

  percent(count: number, total: number): number {
    return total ? +((count / total) * 100).toFixed(2) : 0;
  }

  getTooltip(row: any, tech: string, phase: string): string {
    return `${tech.toUpperCase()} (${phase}): ${row[`${tech}_${phase}`]}%`;
  }

  hasUptick(row: any, tech: string, phase: string): boolean {
    return phase !== 'before' && row[`${tech}_${phase}`] > row[`${tech}_before`];
  }
}
