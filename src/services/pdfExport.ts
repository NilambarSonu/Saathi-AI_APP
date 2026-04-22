import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SoilTest } from '@/features/soil_analysis/services/soil';
import { User } from '@/features/auth/services/auth';
import { Platform, Alert } from 'react-native';

export async function exportSoilReport(tests: SoilTest[], user: User) {
  try {
    const html = generateReportHTML(tests, user);
    const { uri } = await Print.printToFileAsync({ 
      html, 
      base64: false,
      width: 612,
      height: 792,
    });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Soil Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Success', 'PDF generated successfully at: ' + uri);
    }
  } catch (error) {
    console.error('[PDF Export Error]', error);
    throw error;
  }
}

function generateReportHTML(tests: SoilTest[], user: User): string {
  // Sort tests by date descending
  const sortedTests = [...tests].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Calculate statistics
  const avgPh = tests.reduce((sum, t) => sum + Number(t.ph), 0) / tests.length;
  const avgN = tests.reduce((sum, t) => sum + Number(t.n), 0) / tests.length;
  const avgP = tests.reduce((sum, t) => sum + Number(t.p), 0) / tests.length;
  const avgK = tests.reduce((sum, t) => sum + Number(t.k), 0) / tests.length;

  // Generate chart data for last 10 tests
  const chartData = sortedTests.slice(0, 10).reverse();
  const chartLabels = chartData.map((test, i) => 
    new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const nValues = chartData.map(t => Number(t.n));
  const pValues = chartData.map(t => Number(t.p));
  const kValues = chartData.map(t => Number(t.k));

  const rows = sortedTests.map(test => `
    <tr>
      <td>${new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td>${new Date(test.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
      <td class="${Number(test.ph) >= 6 && Number(test.ph) <= 7.5 ? 'good' : 'warn'}">${parseFloat(test.ph.toString()).toFixed(1)}</td>
      <td>${Number(test.n).toFixed(0)}</td>
      <td>${Number(test.p).toFixed(0)}</td>
      <td>${Number(test.k).toFixed(0)}</td>
      <td>${test.moisture ? Number(test.moisture).toFixed(1) + '%' : 'N/A'}</td>
      <td>${test.temperature ? Number(test.temperature).toFixed(1) + '°C' : 'N/A'}</td>
    </tr>
  `).join('');

  // Generate location map info
  const testsWithLocation = tests.filter(t => t.latitude && t.longitude);
  const locationInfo = testsWithLocation.length > 0 ? `
    <div class="section">
      <h3>📍 Test Locations (${testsWithLocation.length} Tests)</h3>
      <div class="location-grid">
        ${testsWithLocation.slice(0, 8).map(test => `
          <div class="location-card">
            <strong>${new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><br/>
            <small>📍 ${Number(test.latitude).toFixed(5)}, ${Number(test.longitude).toFixed(5)}</small><br/>
            <small>pH: ${Number(test.ph).toFixed(1)} | N:${Number(test.n).toFixed(0)} P:${Number(test.p).toFixed(0)} K:${Number(test.k).toFixed(0)}</small>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html><html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1a1a1a; }
        .header { 
          background: linear-gradient(135deg, #0D3B1D 0%, #1A7B3C 100%);
          color: white; 
          padding: 30px; 
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 14px; }
        
        .stats { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 15px; 
          margin-bottom: 30px; 
        }
        .stat { 
          background: #F0FDF4; 
          padding: 20px; 
          border-left: 4px solid #16A34A; 
          border-radius: 8px; 
        }
        .stat-label { font-size: 12px; color: #6B7280; text-transform: uppercase; margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #16A34A; }
        
        .section { margin-bottom: 30px; }
        .section h3 { color: #1A7B3C; margin-bottom: 15px; font-size: 18px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; }
        thead { background: #E8F7ED; }
        th { padding: 12px 10px; text-align: left; font-size: 12px; color: #1A7B3C; font-weight: 600; }
        td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #333; }
        tr:last-child td { border-bottom: none; }
        
        .good { color: #16A34A; font-weight: 600; }
        .warn { color: #F59E0B; font-weight: 600; }
        .bad  { color: #EF4444; font-weight: 600; }
        
        .location-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 12px;
        }
        .location-card {
          background: #F9FAFB;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          font-size: 11px;
        }
        .location-card strong { color: #1A7B3C; font-size: 12px; }
        .location-card small { color: #6B7280; display: block; margin-top: 4px; }
        
        .chart-placeholder {
          background: #F0FDF4;
          border: 2px dashed #16A34A;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          color: #16A34A;
          font-size: 14px;
          margin: 20px 0;
        }
        
        .footer { 
          margin-top: 50px; 
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center; 
          color: #9CA3AF; 
          font-size: 11px; 
        }
        
        @media print {
          body { margin: 15px; }
          .header { break-inside: avoid; }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌱 Saathi AI Soil Report</h1>
        <p>Farmer: ${user.name || user.username || user.email}</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        <p>Total Tests: ${tests.length}</p>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Avg pH Level</div>
          <div class="stat-value">${avgPh.toFixed(2)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Avg Nitrogen</div>
          <div class="stat-value">${avgN.toFixed(0)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Avg Phosphorus</div>
          <div class="stat-value">${avgP.toFixed(0)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Avg Potassium</div>
          <div class="stat-value">${avgK.toFixed(0)}</div>
        </div>
      </div>

      <div class="section">
        <h3>📊 NPK Trend Analysis (Last ${chartData.length} Tests)</h3>
        <div class="chart-placeholder">
          <strong>Trend Data</strong><br/>
          <small>Nitrogen: ${nValues.map(v => v.toFixed(0)).join(' → ')}</small><br/>
          <small>Phosphorus: ${pValues.map(v => v.toFixed(0)).join(' → ')}</small><br/>
          <small>Potassium: ${kValues.map(v => v.toFixed(0)).join(' → ')}</small>
        </div>
      </div>

      ${locationInfo}
      
      <div class="section">
        <h3>📋 Complete Test History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>pH</th>
              <th>N (mg/kg)</th>
              <th>P (mg/kg)</th>
              <th>K (mg/kg)</th>
              <th>Moisture</th>
              <th>Temp</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0 ? rows : "<tr><td colspan='8' style='text-align: center; padding: 20px; color: #9CA3AF;'>No historical data available.</td></tr>"}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <strong>Mitti-AI Innovations</strong> &middot; Empowering Farmers with AI<br/>
        📧 support@saathiai.org &middot; 🌐 www.saathiai.org<br/>
        &copy; ${new Date().getFullYear()} All Rights Reserved
      </div>
    </body></html>
  `;
}


