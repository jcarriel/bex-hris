import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';

// Configurar estilos y opciones de alertify
alertify.set('notifier', 'position', 'top-right');
alertify.set('notifier', 'delay', 5);

export const showSuccess = (message: string) => {
  alertify.success(message);
};

export const showError = (message: string) => {
  alertify.error(message);
};

export const showWarning = (message: string) => {
  alertify.warning(message);
};

export const showInfo = (message: string) => {
  alertify.message(message);
};

export const showConfirm = (message: string, onOk: () => void, onCancel?: () => void) => {
  alertify.confirm(message, onOk, onCancel);
};

export default alertify;
