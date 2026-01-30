import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import alertify from 'alertifyjs';

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'memo' | 'acta' | 'finiquito';
  content: string;
  variables: string[];
  createdAt: string;
}

interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  data: Record<string, string>;
  generatedContent: string;
  createdAt: string;
}

export default function DocumentGeneratorPage() {
  const { theme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'templates' | 'generate' | 'history'>('templates');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Template form states
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    type: 'memo' as 'memo' | 'acta' | 'finiquito',
    content: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [useFileTemplate, setUseFileTemplate] = useState(false);

  // Document generation states
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [documentData, setDocumentData] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedDocuments();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/document-templates');
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      alertify.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneratedDocuments = async () => {
    try {
      const response = await api.client.get('/generated-documents');
      setGeneratedDocs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const handleSaveTemplate = async () => {
    if (!templateFormData.name || !templateFormData.type) {
      alertify.error('Complete todos los campos');
      return;
    }

    try {
      if (useFileTemplate && uploadFile) {
        // Upload file template
        const formData = new FormData();
        formData.append('name', templateFormData.name);
        formData.append('type', templateFormData.type);
        formData.append('file', uploadFile);
        formData.append('variables', JSON.stringify(extractVariables(uploadFile.name)));

        await api.client.post('/document-templates/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alertify.success('Plantilla cargada exitosamente');
      } else if (templateFormData.content) {
        // Create text template
        const variables = extractVariables(templateFormData.content);
        const payload = {
          ...templateFormData,
          variables,
        };

        if (editingTemplate) {
          await api.client.put(`/document-templates/${editingTemplate.id}`, payload);
          alertify.success('Plantilla actualizada');
        } else {
          await api.client.post('/document-templates', payload);
          alertify.success('Plantilla creada');
        }
      } else {
        alertify.error('Debes proporcionar contenido o un archivo');
        return;
      }

      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateFormData({ name: '', type: 'memo', content: '' });
      setUploadFile(null);
      setUseFileTemplate(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alertify.error('Error al guardar plantilla');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;

    try {
      await api.client.delete(`/document-templates/${id}`);
      alertify.success('Plantilla eliminada');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alertify.error('Error al eliminar plantilla');
    }
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      type: template.type,
      content: template.content,
    });
    setShowTemplateForm(true);
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    const initialData: Record<string, string> = {};
    template.variables.forEach((v) => {
      initialData[v] = '';
    });
    setDocumentData(initialData);
    setPreview('');
  };

  const generatePreview = () => {
    if (!selectedTemplate) return;

    let content = selectedTemplate.content;
    Object.entries(documentData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    setPreview(content);
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await api.client.post('/generated-documents', {
        templateId: selectedTemplate.id,
        data: documentData,
      });

      alertify.success('Documento generado');
      setSelectedTemplate(null);
      setDocumentData({});
      setPreview('');
      fetchGeneratedDocuments();
      setActiveTab('history');
    } catch (error) {
      console.error('Error generating document:', error);
      alertify.error('Error al generar documento');
    }
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      const response = await api.client.get(`/generated-documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documento-${docId}.pdf`;
      a.click();
    } catch (error) {
      console.error('Error downloading document:', error);
      alertify.error('Error al descargar documento');
    }
  };

  const typeLabels = {
    memo: '📝 Memorándum',
    acta: '📋 Acta de Entrega',
    finiquito: '💼 Finiquito',
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
        {(['templates', 'generate', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab ? '#00A86B' : 'transparent',
              color: activeTab === tab ? 'white' : theme === 'light' ? '#666' : '#9ca3af',
              border: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '400',
              transition: 'all 0.3s',
            }}
          >
            {tab === 'templates' && '📄 Plantillas'}
            {tab === 'generate' && '✨ Generar'}
            {tab === 'history' && '📚 Historial'}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => {
                setShowTemplateForm(!showTemplateForm);
                setEditingTemplate(null);
                setTemplateFormData({ name: '', type: 'memo', content: '' });
              }}
              style={{
                padding: '10px 20px',
                background: '#00A86B',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontWeight: '500',
                transition: 'background 0.2s',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {showTemplateForm ? '✕ Cancelar' : '+ Nueva Plantilla'}
            </button>
          </div>

          {showTemplateForm && (
            <div
              style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
              }}
            >
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="Ej: Memo por Falta"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      background: theme === 'light' ? 'white' : '#374151',
                      color: theme === 'light' ? '#333' : '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
                    Tipo de Documento
                  </label>
                  <select
                    value={templateFormData.type}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      background: theme === 'light' ? 'white' : '#374151',
                      color: theme === 'light' ? '#333' : '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="memo">Memorándum</option>
                    <option value="acta">Acta de Entrega</option>
                    <option value="finiquito">Finiquito</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px', padding: '15px', background: theme === 'light' ? '#f9f9f9' : '#374151', borderRadius: '5px', border: `1px solid ${theme === 'light' ? '#eee' : '#4b5563'}` }}>
                <label style={{ display: 'block', marginBottom: '10px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px', fontWeight: '600' }}>
                  Tipo de Plantilla
                </label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      checked={!useFileTemplate}
                      onChange={() => setUseFileTemplate(false)}
                      style={{ cursor: 'pointer' }}
                    />
                    Texto
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      checked={useFileTemplate}
                      onChange={() => setUseFileTemplate(true)}
                      style={{ cursor: 'pointer' }}
                    />
                    Archivo Word (.docx)
                  </label>
                </div>
              </div>

              {useFileTemplate ? (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px', fontWeight: '600' }}>
                    Cargar Documento Word
                  </label>
                  <div
                    style={{
                      padding: '20px',
                      border: `2px dashed ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                      borderRadius: '5px',
                      textAlign: 'center',
                      background: theme === 'light' ? '#f9f9f9' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <input
                      id="fileInput"
                      type="file"
                      accept=".docx,.doc"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFile(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
                    <div style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600' }}>
                      {uploadFile ? uploadFile.name : 'Haz clic o arrastra un archivo Word'}
                    </div>
                    <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af', marginTop: '5px' }}>
                      Formatos soportados: .docx, .doc
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
                    Contenido (Usa {'{{'} {'}}'} para variables. Ej: {'{{'} empleado {'}}'})
                  </label>
                <textarea
                  value={templateFormData.content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                  placeholder="Escribe el contenido del documento aquí..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                    borderRadius: '5px',
                    fontSize: '14px',
                    minHeight: '300px',
                    background: theme === 'light' ? 'white' : '#374151',
                    color: theme === 'light' ? '#333' : '#ffffff',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
                </div>
              )}

              <button
                onClick={handleSaveTemplate}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {editingTemplate ? '✏️ Actualizar' : '✚ Crear'} Plantilla
              </button>
            </div>
          )}

          {/* Templates List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {templates.map((template) => (
              <div
                key={template.id}
                style={{
                  background: theme === 'light' ? 'white' : '#1f2937',
                  border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
                  borderRadius: '8px',
                  padding: '15px',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', color: theme === 'light' ? '#333' : '#ffffff' }}>
                  {template.name}
                </h4>
                <p style={{ margin: '5px 0', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                  {typeLabels[template.type]}
                </p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: theme === 'light' ? '#999' : '#6b7280' }}>
                  Variables: {template.variables.join(', ')}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#0050b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && !showTemplateForm && (
            <div style={{ textAlign: 'center', padding: '40px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
              No hay plantillas. Crea una nueva para comenzar.
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Template Selection */}
          <div>
            <h3 style={{ color: theme === 'light' ? '#333' : '#ffffff', marginTop: 0 }}>Selecciona una Plantilla</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  style={{
                    padding: '12px',
                    background: selectedTemplate?.id === template.id ? '#00A86B' : theme === 'light' ? 'white' : '#1f2937',
                    color: selectedTemplate?.id === template.id ? 'white' : theme === 'light' ? '#333' : '#ffffff',
                    border: `2px solid ${selectedTemplate?.id === template.id ? '#00A86B' : theme === 'light' ? '#eee' : '#374151'}`,
                    borderRadius: '5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{template.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{typeLabels[template.type]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Input */}
          {selectedTemplate && (
            <div>
              <h3 style={{ color: theme === 'light' ? '#333' : '#ffffff', marginTop: 0 }}>Completa los Datos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
                      {variable.charAt(0).toUpperCase() + variable.slice(1)}
                    </label>
                    <input
                      type="text"
                      value={documentData[variable] || ''}
                      onChange={(e) => setDocumentData({ ...documentData, [variable]: e.target.value })}
                      placeholder={`Ingresa ${variable}`}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '14px',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={generatePreview}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#0050b3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  👁️ Vista Previa
                </button>
                <button
                  onClick={handleGenerateDocument}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✨ Generar
                </button>
              </div>

              {preview && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: theme === 'light' ? '#f9f9f9' : '#111827',
                    border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
                    borderRadius: '5px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  <h4 style={{ margin: '0 0 10px 0', color: theme === 'light' ? '#333' : '#ffffff' }}>Vista Previa</h4>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      fontSize: '13px',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      fontFamily: 'monospace',
                    }}
                  >
                    {preview}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedTemplate && (
            <div style={{ textAlign: 'center', padding: '40px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
              Selecciona una plantilla para comenzar
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <h3 style={{ color: theme === 'light' ? '#333' : '#ffffff', marginTop: 0 }}>Documentos Generados</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Plantilla</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Fecha</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {generatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                      No hay documentos generados
                    </td>
                  </tr>
                ) : (
                  generatedDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{doc.templateName}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{typeLabels[doc.type as keyof typeof typeLabels]}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>
                        {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownloadDocument(doc.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          ⬇️ Descargar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
