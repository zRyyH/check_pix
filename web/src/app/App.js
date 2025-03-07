import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './App.module.css';

function App() {
  const [files, setFiles] = useState({
    corpx: null,
    itau: null,
    digital: null,
    generico: null,
  });
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleMultipleFilesChange = (e) => {
    const filesArr = Array.from(e.target.files);
    setMultipleFiles(filesArr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (multipleFiles.length < 1) {
      alert("Você deve selecionar pelo menos 1 comprovante.");
      return;
    }
    if (!files.corpx || !files.digital || !files.itau || !files.generico) {
      alert("Você deve selecionar todos os arquivos individuais: corpx, digital, itau e generico.");
      return;
    }

    const formData = new FormData();
    multipleFiles.forEach((file) => formData.append("comprovantes", file));
    formData.append("corpx", files.corpx);
    formData.append("digital", files.digital);
    formData.append("itau", files.itau);
    formData.append("generico", files.generico);

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/carregar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error("Erro ao enviar os arquivos");
      const result = await response.json();
      setResponseData(result);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar os arquivos.");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para gerar o PDF com os dados de resposta
  const handleGeneratePDF = () => {
    if (!responseData) {
      alert("Sem dados para gerar relatório.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Validação", 14, 22);
    doc.setFontSize(12);
    let startY = 32;

    // Função auxiliar para montar dados da tabela
    const buildTableData = (registros) => {
      const tableData = [];
      registros.forEach((item, index) => {
        const reg = `Registro ${index + 1}`;
        // Processa comprovante
        Object.entries(item.comprovante).forEach(([id, data]) => {
          tableData.push([
            reg,
            "Comprovante",
            id,
            data.nome,
            data.valor,
            data.data,
            data.banco,
          ]);
        });
        // Processa transferência
        if (typeof item.transferencia === 'object') {
          Object.entries(item.transferencia).forEach(([key, value]) => {
            if (typeof value === 'object') {
              tableData.push([
                reg,
                "Transferência",
                key,
                value.nome,
                value.valor,
                value.data,
                value.banco,
              ]);
            } else {
              tableData.push([reg, "Transferência", key, value, "", "", ""]);
            }
          });
        } else {
          tableData.push([reg, "Transferência", "", item.transferencia, "", "", ""]);
        }
      });
      return tableData;
    };

    const validData = buildTableData(responseData.validos || []);
    const invalidData = buildTableData(responseData.invalidos || []);

    // Adiciona tabela de registros válidos
    if (validData.length > 0) {
      doc.text("Válidos", 14, startY);
      autoTable(doc, {
        head: [['Registro', 'Tipo', 'ID', 'Nome', 'Valor', 'Data', 'Banco']],
        body: validData,
        startY: startY + 4,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226] },
      });
      startY = doc.lastAutoTable.finalY + 10;
    }
    // Adiciona tabela de registros inválidos
    if (invalidData.length > 0) {
      doc.text("Inválidos", 14, startY);
      autoTable(doc, {
        head: [['Registro', 'Tipo', 'ID', 'Nome', 'Valor', 'Data', 'Banco']],
        body: invalidData,
        startY: startY + 4,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226] },
      });
    }
    doc.save("relatorio.pdf");
  };

  // Função auxiliar para renderizar um campo com label e valor
  const renderDetail = (label, value) => (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}:</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );

  // Renderiza os resultados em layout vertical e minimalista
  const renderResults = () => (
    <div className={styles.resultsContainer}>
      {responseData.validos && responseData.validos.length > 0 && (
        <div className={styles.resultsSection}>
          <h3>Válidos</h3>
          {responseData.validos.map((item, index) => (
            <div key={index} className={styles.resultCard}>
              <h4>Registro {index + 1}</h4>
              <div className={styles.section}>
                <h5>Comprovante</h5>
                {Object.entries(item.comprovante).map(([id, data]) => (
                  <div key={id} className={styles.detailCard}>
                    {renderDetail("ID", id)}
                    {renderDetail("Nome", data.nome)}
                    {renderDetail("Valor", data.valor)}
                    {renderDetail("Data", data.data)}
                    {renderDetail("Banco", data.banco)}
                  </div>
                ))}
              </div>
              <div className={styles.section}>
                <h5>Transferência</h5>
                {typeof item.transferencia === 'object'
                  ? Object.entries(item.transferencia).map(([key, value]) =>
                    typeof value === 'object' ? (
                      <div key={key} className={styles.detailCard}>
                        {renderDetail("ID", key)}
                        {renderDetail("Nome", value.nome)}
                        {renderDetail("Valor", value.valor)}
                        {renderDetail("Data", value.data)}
                        {renderDetail("Banco", value.banco)}
                      </div>
                    ) : (
                      <div key={key} className={styles.detailCard}>
                        {renderDetail(key, value)}
                      </div>
                    )
                  )
                  : <p>{item.transferencia}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {responseData.invalidos && responseData.invalidos.length > 0 && (
        <div className={styles.resultsSection}>
          <h3>Inválidos</h3>
          {responseData.invalidos.map((item, index) => (
            <div key={index} className={styles.resultCard}>
              <h4>Registro {index + 1}</h4>
              <div className={styles.section}>
                <h5>Comprovante</h5>
                {Object.entries(item.comprovante).map(([id, data]) => (
                  <div key={id} className={styles.detailCard}>
                    {renderDetail("ID", id)}
                    {renderDetail("Nome", data.nome)}
                    {renderDetail("Valor", data.valor)}
                    {renderDetail("Data", data.data)}
                    {renderDetail("Banco", data.banco)}
                  </div>
                ))}
              </div>
              <div className={styles.section}>
                <h5>Transferência</h5>
                {typeof item.transferencia === 'object'
                  ? Object.entries(item.transferencia).map(([key, value]) =>
                    typeof value === 'object' ? (
                      <div key={key} className={styles.detailCard}>
                        {renderDetail("ID", key)}
                        {renderDetail("Nome", value.nome)}
                        {renderDetail("Valor", value.valor)}
                        {renderDetail("Data", value.data)}
                        {renderDetail("Banco", value.banco)}
                      </div>
                    ) : (
                      <div key={key} className={styles.detailCard}>
                        {renderDetail(key, value)}
                      </div>
                    )
                  )
                  : <p>{item.transferencia}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.mainWrapper}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.animateItem}>Upload Premium Arquivos</h1>
        </header>
        <div className={styles.flexContainer}>
          {/* Coluna de Upload */}
          <div className={styles.uploadColumn}>
            <section className={`${styles.card} ${styles.animateItem}`}>
              <h2>Arquivos Individuais</h2>
              <div className={styles.inputGroup}>
                <label htmlFor="corpx">Corpx</label>
                <input
                  id="corpx"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'corpx')}
                  accept="*"
                />
                {files.corpx && <span className={styles.fileName}>{files.corpx.name}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="itau">Itau</label>
                <input
                  id="itau"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'itau')}
                  accept="*"
                />
                {files.itau && <span className={styles.fileName}>{files.itau.name}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="digital">Digital</label>
                <input
                  id="digital"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'digital')}
                  accept="*"
                />
                {files.digital && <span className={styles.fileName}>{files.digital.name}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="generico">Generico</label>
                <input
                  id="generico"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'generico')}
                  accept="*"
                />
                {files.generico && <span className={styles.fileName}>{files.generico.name}</span>}
              </div>
            </section>
            <section className={`${styles.card} ${styles.cardComprovantes} ${styles.animateItem}`}>
              <h2>Comprovantes</h2>
              <input
                type="file"
                multiple
                onChange={handleMultipleFilesChange}
                accept="*"
              />
              <div className={styles.fileList}>
                {multipleFiles.map((file, index) => (
                  <div key={index} className={`${styles.fileItem} ${styles.animateItem}`}>
                    {file.name}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Coluna de Resultados */}
          <div className={styles.resultColumn}>
            <button
              type="button"
              className={`${styles.submitButton} ${styles.animateItem}`}
              onClick={handleSubmit}
            >
              Enviar
            </button>
            {isLoading && (
              <div className={`${styles.loadingIndicator} ${styles.animateItem}`}>
                Carregando...
              </div>
            )}
            {responseData && (
              <div className={`${styles.responseSection} ${styles.animateItem}`}>
                {renderResults()}
                <button
                  type="button"
                  className={`${styles.submitButton} ${styles.animateItem}`}
                  onClick={handleGeneratePDF}
                >
                  Gerar Relatório PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;