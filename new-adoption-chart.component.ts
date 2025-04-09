// new-adoption-chart.component.ts
// Version: 1.0
// This component displays a Highcharts stacked column chart showing new technology adoption metrics.
// A trainee is considered a new adopter for a technology if they had 0 contributions before training 
// and contributed either during or after the training.

import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-new-adoption-chart',
  templateUrl: './new-adoption-chart.component.html',
  styleUrls: ['./new-adoption-chart.component.css']
})
export class NewAdoptionChartComponent implements OnInit {
  // Expose Highcharts to the template.
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options;

  // Example data arrays: Replace these with your computed values.
  // Each element corresponds to a technology (e.g., Java, SQL, etc.).
  technologies: string[] = ['Java', 'SQL', 'Angular', 'Node'];
  
  // New adopters computed from aggregated data.
  // For each technology, these arrays contain the counts of new adopters:
  // - duringTraining: those that started contributing during the training.
  // - afterTraining: those that started contributing after the training.
  duringTraining: number[] = [5, 10, 15, 7];
  afterTraining: number[] = [3, 8, 10, 2];

  constructor() {}

  ngOnInit(): void {
    this.initializeChart();
  }

  initializeChart(): void {
    this.chartOptions = {
      chart: {
        type: 'column'
      },
      title: {
        text: 'New Technology Adoption Metrics'
      },
      xAxis: {
        categories: this.technologies,
        title: {
          text: 'Technology'
        }
      },
      yAxis: {
        min: 0,
        title: {
          text: 'Number of New Adopters'
        },
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: 'gray'
          }
        }
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
      },
      plotOptions: {
        column: {
          stacking: 'normal',
          dataLabels: {
            enabled: true
          }
        }
      },
      series: [
        {
          name: 'During Training',
          type: 'column',
          data: this.duringTraining,
          color: '#7cb5ec'
        },
        {
          name: 'After Training',
          type: 'column',
          data: this.afterTraining,
          color: '#434348'
        }
      ]
    };
  }
}
