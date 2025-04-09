<p-table
  *ngIf="processedData.length"
  [value]="processedData"
  [paginator]="true"
  [rows]="10"
  [rowsPerPageOptions]="[100, 200, 500]"
  responsiveLayout="scroll"
  styleClass="p-datatable-gridlines"
>
  <ng-template pTemplate="header">
    <tr>
      <th>Trainee</th>
      <th *ngFor="let tech of allTechnologies">{{ tech | titlecase }}</th>
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-row>
    <tr>
      <td>{{ row.trainee }}</td>
      <td *ngFor="let tech of allTechnologies">
        <div class="skill-cell" [pTooltip]="getTooltip(row, tech, 'before')" tooltipPosition="top">
          Before: {{ row[tech]?.before || 0 }}
        </div>
        <div class="skill-cell" [ngClass]="{ 'uptick': hasUptick(row, tech, 'during') }"
             [pTooltip]="getTooltip(row, tech, 'during')" tooltipPosition="top">
          During: {{ row[tech]?.during || 0 }}
        </div>
        <div class="skill-cell" [ngClass]="{ 'uptick': hasUptick(row, tech, 'after') }"
             [pTooltip]="getTooltip(row, tech, 'after')" tooltipPosition="top">
          After: {{ row[tech]?.after || 0 }}
        </div>
      </td>
    </tr>
  </ng-template>
</p-table>

<div class="legend">
  <p><strong>Legend:</strong></p>
  <ul>
    <li><strong>Before:</strong> Jan 2024 – Mar 2024</li>
    <li><strong>During:</strong> Apr 2024 – Jul 2024</li>
    <li><strong>After:</strong> Aug 2024 – Nov 2024 (or till Mar 2025 if flag enabled)</li>
    <li><span class="legend-uptick">Green Highlight</span>: Increase in contribution compared to 'Before'</li>
    <li>Tooltip shows % contribution to total commits involving that skill</li>
  </ul>
</div>
