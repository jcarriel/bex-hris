// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
interface PayrollData {
  id: string;
  employeeName: string;
  cedula: string;
  year: number;
  month: number;
  position?: string;
  workDays?: number;
  baseSalary: number;
  reserveFunds: number;
  twelfthSalary: number;
  fourteenthSalary: number;
  responsibilityBonus: number;
  productivityBonus: number;
  foodAllowance: number;
  vacation?: number;
  overtimeValue50?: number;
  overtimeHours50?: number;
  otherIncome: number;
  totalIncome: number;
  advance: number;
  iessContribution: number;
  incomeTax: number;
  iessLoan: number;
  companyLoan: number;
  spouseExtension: number;
  nonWorkDays: number;
  otherDeductions: number;
  foodDeduction: number;
  totalDeductions: number;
  totalToPay: number;
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const generatePayrollPDFContent = (payroll: PayrollData, companyName: string = 'BIOEXPORTVAL S.A.S.'): string => {
  const monthName = monthNames[payroll.month - 1];
  
  // Filtrar ingresos con valor > 0
  const incomeItems = [
    { label: 'Sueldo', value: payroll.baseSalary },
    { label: 'Fondos Reserva', value: payroll.reserveFunds },
    { label: 'Décimo Tercero', value: payroll.twelfthSalary },
    { label: 'Décimo Cuarto', value: payroll.fourteenthSalary },
    { label: 'Bonificación Responsabilidad', value: payroll.responsibilityBonus },
    { label: 'Bonificación Productividad', value: payroll.productivityBonus },
    { label: 'Alimentación (ART 14 LEY SEG SOCIAL)', value: payroll.foodAllowance },
    { label: 'Vacaciones', value: payroll.vacation },
    { label: `Horas Extras 50% (${payroll.overtimeHours50 || 0})`, value: payroll.overtimeValue50 },
    { label: 'Otros Ingresos', value: payroll.otherIncome },
  ].filter(item => item.value > 0);

  // Calcular total de ingresos sumando todos los items
  const calculatedTotalIncome = incomeItems.reduce((sum, item) => sum + (item.value || 0), 0);

  // Filtrar egresos con valor > 0
  const deductionItems = [
    { label: 'Quincena', value: payroll.advance },
    { label: '9.45% IESS', value: payroll.iessContribution },
    { label: 'Impuesto a la Renta', value: payroll.incomeTax },
    { label: 'Préstamo IESS', value: payroll.iessLoan },
    { label: 'Préstamo Empresarial', value: payroll.companyLoan },
    { label: 'Extensión Conyugal', value: payroll.spouseExtension },
    { label: 'Días No Laborados', value: payroll.nonWorkDays },
    { label: 'Otros Descuentos', value: payroll.otherDeductions },
    { label: 'Alimentación', value: payroll.foodDeduction },
  ].filter(item => item.value > 0);

  // Calcular total de egresos sumando todos los items
  const calculatedTotalDeductions = deductionItems.reduce((sum, item) => sum + (item.value || 0), 0);

  // Calcular total a recibir (ingresos - egresos)
  const calculatedTotalToPay = calculatedTotalIncome - calculatedTotalDeductions;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
       <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          color: #333;
          background: white;
        }
        .container {
          width: 80%;
          max-width: 800px;
          margin: 0 auto;
          padding: 5px;
          background: white;
          min-height: 45vh;
          flex-direction: column;
        }
        .header {
          border: 1px solid #333;
          padding: 10px;
          margin-bottom: 1px;
        }
        .company-info {
          margin-bottom: 1px;
        }
        .company-name {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 1px;
        }
        .company-details {
          font-size: 10px;
          color: #666;
          line-height: 1.2;
        }
        .title {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          margin: 2px 0;
          color: #333;
        }
        .period {
          text-align: center;
          font-size: 11px;
          color: #666;
          margin-bottom: 1px;
        }
        .employee-section {
          margin-bottom: 1px;
          padding-bottom: 1px;
          border-bottom: 1px solid #ddd;
        }
        .employee-label {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 1px;
        }
        .employee-info {
          font-size: 11px;
          line-height: 1.6;
        }
        .work-days {
          text-align: right;
          font-size: 10px;
          margin-top: 1px;
        }
        .content {
          display: flex;
          gap: 40px;
          margin-bottom: 1px;
        }
        .column {
          flex: 1;
        }
        .column-title {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 1px;
          padding-bottom: 4px;
          border-bottom: 2px solid #333;
        }
        .income-title {
          border-bottom-color: #333;
          color: #000;
        }
        .deduction-title {
          border-bottom-color: #333;
          color: #000;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin-bottom: 1px;
          padding-bottom: 1px;
        }
        .item-label {
          flex: 1;
        }
        .item-value {
          text-align: right;
          min-width: 80px;
          font-weight: 500;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: bold;
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid #333;
          color: #000;
        }
        .total-label {
          flex: 1;
        }
        .total-value {
          text-align: right;
          min-width: 80px;
        }
        .total-income-value {
          color: #000;
          font-weight: bold;
        }
        .total-deduction-value {
          color: #000;
          font-weight: bold;
        }
        .net-pay-section {
          border-top: 3px solid #333;
          border-bottom: 3px solid #333;
          padding: 10px 0;
          margin: 10px 0 10px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .net-pay-label {
          font-weight: bold;
          font-size: 12px;
          color: #000;
        }
        .net-pay-value {
          font-size: 14px;
          font-weight: bold;
          color: #000;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          gap: 40px;
          flex-grow: 1;
          align-items: flex-end;
          padding-top: 25px;
        }
        .signature-block {
          flex: 1;
          text-align: center;
          flex-direction: column;
          height: 140px;
        }
        .signature-line {
          border-top: 1px solid #333;
          flex: 1;
          margin-bottom: 0px;
        }
        .signature-label {
          font-size: 11px;
          font-weight: bold;
          color: #000;
          margin-bottom: 0px;
          margin-top: 0px;
        }
        .signature-name {
          font-size: 11px;
          color: #000;
          margin-top: 0px;
        }
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-info">
            <div class="company-name">${companyName}</div>
            <div class="company-details">
              SEGUNDA OESTE 205A Y AV PRINC / SAMBORONDON<br>
              RUC: 0992989464001
            </div>
          </div>
        </div>

        <div class="title">Rol de Pagos Individual</div>
        <div class="period">Período: ${monthName} ${payroll.year}</div>

        <div class="employee-section">
          <div class="employee-label">Empleado:</div>
          <div class="employee-info">
            <div>${payroll.employeeName}</div>
            <div>C.I.: ${payroll.cedula}</div>
            ${payroll.position ? `<div>Cargo: ${payroll.position}</div>` : ''}
          </div>
          <div class="work-days">Días Trabajados: ${payroll.workDays || 30}</div>
        </div>

        <div class="content">
          <div class="column">
            <div class="column-title income-title">Ingresos</div>
            ${incomeItems.map(item => `
              <div class="item-row">
                <div class="item-label">${item.label}</div>
                <div class="item-value">$${item.value.toFixed(2)}</div>
              </div>
            `).join('')}
            <div class="total-row">
              <div class="total-label">Total Ingresos</div>
              <div class="total-value total-income-value">$${calculatedTotalIncome.toFixed(2)}</div>
            </div>
          </div>

          <div class="column">
            <div class="column-title deduction-title">Egresos</div>
            ${deductionItems.map(item => `
              <div class="item-row">
                <div class="item-label">${item.label}</div>
                <div class="item-value">$${item.value.toFixed(2)}</div>
              </div>
            `).join('')}
            <div class="total-row">
              <div class="total-label">Total Egresos</div>
              <div class="total-value total-deduction-value">$${calculatedTotalDeductions.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div class="net-pay-section">
          <div class="net-pay-label">Total a Recibir</div>
          <div class="net-pay-value">$${calculatedTotalToPay.toFixed(2)}</div>
        </div>

        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Firma Empleador</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${payroll.employeeName}</div>
            <div class="signature-name">C.I.: ${payroll.cedula}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generatePayrollPDF = (payroll: PayrollData, companyName?: string) => {
  const htmlContent = generatePayrollPDFContent(payroll, companyName);
  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const opt = {
    margin: 0,
    filename: `Rol_Pago_${payroll.cedula}_${payroll.year}${String(payroll.month).padStart(2, '0')}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  html2pdf().set(opt).from(element).save();
};


export const generateMultiplePayrollPDFsAsOne = (
  payrolls: PayrollData[],
  companyName?: string,
  onProgress?: (current: number, total: number) => void
) => {
  const monthName = monthNames[payrolls[0]?.month - 1] || 'Período';
  const year = payrolls[0]?.year || new Date().getFullYear();
  const total = payrolls.length;

  // Generar contenido HTML de todas las páginas
  let allContent = '';
  for (let i = 0; i < payrolls.length; i++) {
    const content = generatePayrollPDFContent(payrolls[i], companyName);
    // Remover etiquetas HTML externas y convertir container a page
    const pageContent = content
      .replace(/<html>|<\/html>|<head>[\s\S]*?<\/head>|<body>|<\/body>/g, '')
      .replace('<div class="container">', '<div class="page">');
    allContent += pageContent;
    
    // Llamar callback de progreso
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  // Crear HTML consolidado con todas las páginas
  const consolidatedHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #333; background: white; }
        .page { page-break-after: always; width: 80%; max-width: 800px; margin: 0 auto; padding: 5px; background: white; min-height: 45vh; display: flex; flex-direction: column; }
        .page:last-child { page-break-after: avoid; }
        .header { border: 1px solid #333; padding: 10px; margin-bottom: 1px; }
        .company-info { margin-bottom: 1px; }
        .company-name { font-weight: bold; font-size: 10px; margin-bottom: 1px; }
        .company-details { font-size: 10px; color: #666; line-height: 1.2; }
        .title { text-align: center; font-size: 12px; font-weight: bold; margin: 2px 0; color: #333; }
        .period { text-align: center; font-size: 11px; color: #666; margin-bottom: 1px; }
        .employee-section { margin-bottom: 1px; padding-bottom: 1px; border-bottom: 1px solid #ddd; }
        .employee-label { font-weight: bold; font-size: 10px; margin-bottom: 1px; }
        .employee-info { font-size: 11px; line-height: 1.6; }
        .work-days { text-align: right; font-size: 10px; margin-top: 1px; }
        .content { display: flex; gap: 40px; margin-bottom: 1px; }
        .column { flex: 1; }
        .column-title { font-weight: bold; font-size: 12px; margin-bottom: 1px; padding-bottom: 4px; border-bottom: 2px solid #333; }
        .income-title { border-bottom-color: #333; color: #000; }
        .deduction-title { border-bottom-color: #333; color: #000; }
        .item-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 1px; padding-bottom: 1px; }
        .item-label { flex: 1; }
        .item-value { text-align: right; min-width: 80px; font-weight: 500; }
        .total-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 1px; padding-top: 5px; border-top: 1px solid #333; color: #000; }
        .total-label { flex: 1; }
        .total-value { text-align: right; min-width: 80px; }
        .total-income-value { color: #000; font-weight: bold; }
        .total-deduction-value { color: #000; font-weight: bold; }
        .net-pay-section { border-top: 3px solid #333; border-bottom: 3px solid #333; padding: 10px 0; margin: 10px 0 10px 0; display: flex; justify-content: space-between; align-items: center; }
        .net-pay-label { font-weight: bold; font-size: 12px; color: #000; }
        .net-pay-value { font-size: 14px; font-weight: bold; color: #000; }
        .signature-section { display: flex; justify-content: space-between; margin-top: 30px; gap: 40px; flex-grow: 1; align-items: flex-end; padding-top: 25px; }
        .signature-block { flex: 1; text-align: center; flex-direction: column; height: 140px; }
        .signature-line { border-top: 1px solid #333; flex: 1; margin-bottom: 0px; }
        .signature-label { font-size: 11px; font-weight: bold; color: #000; margin-bottom: 0px; margin-top: 0px; }
        .signature-name { font-size: 11px; color: #000; margin-top: 0px; }
      </style>
    </head>
    <body>
      ${allContent}
    </body>
    </html>
  `;

  const element = document.createElement('div');
  element.innerHTML = consolidatedHTML;

  const opt = {
    margin: 0,
    filename: `Roles_Pago_${monthName}_${year}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 1.5, useCORS: true, allowTaint: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  html2pdf().set(opt).from(element).save();
};

export default generatePayrollPDF;
