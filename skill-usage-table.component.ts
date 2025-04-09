import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-skill-usage-table',
  templateUrl: './app-skill-usage-table.component.html',
  styleUrls: ['./app-skill-usage-table.component.css']
})
export class SkillUsageTableComponent implements OnChanges {
  @Input() commitData: any[] = [];
  @Input() stub = false;
  @Input() showUntilMarch = false;

  readonly trainingStart = '2024-04';
  readonly trainingEnd = '2024-07';
  readonly afterDefaultStart = '2024-08';
  readonly afterFullStart = '2024-08';
  readonly afterFullEnd = '2025-03';

  allTechnologies: string[] = [];
  processedData: any[] = [];
  isLoading = true;

  readonly javaFullStackTechnologies = [
    'html', 'js', 'typescript', 'core java', 'advance java',
    'angular', 'react', 'jest', 'swagger', 'rest', 'spring boot',
    'mssql', 'oracle', 'mongodb', 'nosql', 'hadoop', 'junit',
    'hibernate', 'jpa', 'kafka', 'openshift', 'sast',
    'spring security', 'jenkins', 'maven', 'gradle'
  ];

  readonly fileExtensionToTechMap: Record<string, string> = {
    ts: 'typescript',
    js: 'js',
    html: 'html',
    java: 'java',
    py: 'python',
    xml: 'spring',
    json: 'swagger',
    sql: 'database',
    yml: 'jenkins',
    css: 'styles',
    md: 'documentation',
    gradle: 'gradle',
    hbm: 'hibernate',
    jsx: 'react',
    test: 'jest'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.commitData?.length) return;

    this.isLoading = true;

    const filteredCommits = this.commitData.map(commit => {
      const extensions = commit.FileName?.split(',') || [];
      const techs = new Set<string>();

      extensions.forEach((file: string) => {
        const ext = file.split('.').pop()?.trim().toLowerCase();
        const tech = this.fileExtensionToTechMap[ext || ''];
        if (tech && this.javaFullStackTechnologies.includes(tech)) {
          techs.add(tech);
        }
      });

      return {
        ...commit,
        technologies: Array.from(techs),
        month: commit.Month
      };
    }).filter(c => c.technologies.length > 0);

    const grouped: Record<string, any> = {};

    filteredCommits.forEach(commit => {
      const author = commit.AuthorName || 'Unknown';
      if (!grouped[author]) {
        grouped[author] = { trainee: author };
      }

      commit.technologies.forEach((tech: string) => {
        const key = this.getPhase(commit.month);
        const obj = grouped[author][tech] || { before: 0, during: 0, after: 0 };
        obj[key]++;
        grouped[author][tech] = obj;
      });
    });

    this.processedData = Object.values(grouped);
    this.allTechnologies = this.getAllRelevantTechs(this.processedData);
    this.isLoading = false;
  }

  getAllRelevantTechs(data: any[]): string[] {
    const techSet = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (['trainee'].includes(key)) return;
        techSet.add(key);
      });
    });
    return Array.from(techSet);
  }

  getPhase(month: string): 'before' | 'during' | 'after' {
    if (month < this.trainingStart) return 'before';
    if (month >= this.trainingStart && month <= this.trainingEnd) return 'during';
    if (!this.showUntilMarch && month > '2024-11') return 'ignore';
    return 'after';
  }

  hasUptick(row: any, tech: string, phase: 'before' | 'during' | 'after'): boolean {
    if (phase === 'before') return false;
    return (row[tech]?.[phase] || 0) > (row[tech]?.before || 0);
  }

  getTooltip(row: any, tech: string, phase: 'before' | 'during' | 'after'): string {
    const value = row[tech]?.[phase] || 0;
    const total = Object.values(row[tech] || {}).reduce((acc: number, v: number) => acc + v, 0);
    const percentage = total ? ((value / total) * 100).toFixed(1) : '0';
    return `Commits: ${value} (${percentage}%)`;
  }
}
