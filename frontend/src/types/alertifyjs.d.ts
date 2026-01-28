declare module 'alertifyjs' {
  interface AlertifyInstance {
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    message(message: string): void;
    confirm(message: string, onOk: () => void, onCancel?: () => void): void;
    set(setting: string, key: string, value: any): void;
  }

  const alertify: AlertifyInstance;
  export default alertify;
}
