import { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';

interface VacationData {
  employeeName: string;
  employeeCedula: string;
  companyName: string;
  companyManager: string;
  managerPosition: string;
  vacationDays: number;
  startDate: string;
  endDate: string;
  period: string;
  location: string;
}

export const generateVacationDocument = async (data: VacationData) => {
  // Formatear fechas
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const today = new Date();

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  };

  const formatDateShort = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startDateFormatted = formatDate(startDate);
  const endDateFormatted = formatDate(endDate);
  const todayFormatted = formatDate(today);
  const locationFormatted = data.location || 'Naranjal';

  // Crear documento con Calibri tamaño 11
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // Fecha y ubicación
          new Paragraph({
            children: [
              new TextRun({
                text: `${locationFormatted}, ${todayFormatted}`,
                font: 'Calibri',
                size: 22, // 11pt = 22 half-points
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
          }),

          // Destinatario
          new Paragraph({
            children: [
              new TextRun({
                text: data.companyManager,
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.managerPosition,
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.companyName,
                font: 'Calibri',
                size: 22,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Presente.-',
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Cuerpo
          new Paragraph({
            children: [
              new TextRun({
                text: 'De mis consideraciones:',
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Párrafo principal
          new Paragraph({
            children: [
              new TextRun({
                text: `Yo ${data.employeeName} cédula de identidad ${data.employeeCedula}. Empleado (a) de ${data.companyName}. Solicito se me conceda adelantar ${data.vacationDays} días de vacaciones que corresponden al período del ${data.period}. Desde el día ${formatDateShort(startDate)} al ${formatDateShort(endDate)} de ${endDate.getFullYear()}.`,
                font: 'Calibri',
                size: 22,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
          }),

          // Párrafo de cierre
          new Paragraph({
            children: [
              new TextRun({
                text: 'Esperando que la presente tenga la debida aceptación, anticipo mis agradecimientos.',
                font: 'Calibri',
                size: 22,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 600 },
          }),

          // Despedida
          new Paragraph({
            children: [
              new TextRun({
                text: 'Atentamente,',
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 600 },
          }),

          // Línea de firma
          new Paragraph({
            children: [
              new TextRun({
                text: '_______________________________',
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),

          // Nombre y cédula del firmante
          new Paragraph({
            children: [
              new TextRun({
                text: data.employeeName.toUpperCase(),
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `C.I. ${data.employeeCedula}`,
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { after: 0 },
          }),
        ],
      },
    ],
  });

  // Generar y descargar
  const blob = await Packer.toBlob(doc);
  const fileName = `Solicitud_Vacaciones_${data.employeeName.replace(/\s+/g, '_')}_${formatDateShort(today)}.docx`;
  saveAs(blob, fileName);
};
