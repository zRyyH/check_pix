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

  // Remove quebras de linha e garante que o valor seja string
  const sanitize = (value) => {
    if (value == null) return "";
    if (typeof value !== 'string') value = String(value);
    return value.replace(/(\r\n|\n|\r)/gm, ' ');
  };

  // Função para formatar os campos conforme as regras:
  // Se campo for "nome" ou "data" e estiver vazio, retorna "Desconhecido".
  // Se campo for "valor" e for 0, retorna "Desconhecido".
  const formatField = (field, value) => {
    const cleanedValue = sanitize(value);
    if ((field === 'nome' || field === 'data') && cleanedValue.trim() === "") {
      return "Desconhecido";
    }
    if (field === 'valor' && (cleanedValue.trim() === "0" || cleanedValue.trim() === "0.0")) {
      return "Desconhecido";
    }
    return cleanedValue;
  };

  // Função que unifica comprovantes e transferências em pares
  const mergeComprovantesTransferencias = (comprovanteObj, transferenciaObj) => {
    const comprovantes = Object.values(comprovanteObj || {});
    let transferencias = [];
    if (transferenciaObj && typeof transferenciaObj === 'object') {
      transferencias = Object.values(transferenciaObj).filter(
        (val) => val && typeof val === 'object'
      );
    }
    const maxLen = Math.max(comprovantes.length, transferencias.length);
    const merged = [];
    for (let i = 0; i < maxLen; i++) {
      merged.push({
        comprovante: comprovantes[i] || {},
        transferencia: transferencias[i] || {},
      });
    }
    return merged;
  };

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
    const formData = new FormData();
    multipleFiles.forEach((file) => formData.append("comprovantes", file));
    if (files.corpx) formData.append("corpx", files.corpx);
    if (files.itau) formData.append("itau", files.itau);
    if (files.digital) formData.append("digital", files.digital);
    if (files.generico) formData.append("generico", files.generico);

    try {
      setIsLoading(true);
      const response = await fetch('https://checkpixapi.awpsoft.com.br/carregar', {
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

  // Gera PDF unindo os dados dos registros.
  // Relatório ajustado com letras menores e layout mais compacto.
  const handleGeneratePDF = () => {
    if (!responseData) {
      alert("Sem dados para gerar relatório.");
      return;
    }
    const doc = new jsPDF();
    // Título com fonte menor e posição ajustada
    doc.setFontSize(14);
    doc.text("Relatório de Validação", 14, 15);
    // Define fonte menor para o restante do relatório
    doc.setFontSize(8);
    let startY = 22;

    const buildTableData = (registros, isValid) => {
      const tableData = [];
      registros.forEach((item) => {
        const pairs = mergeComprovantesTransferencias(
          item.comprovante,
          item.transferencia
        );
        pairs.forEach(({ comprovante, transferencia }) => {
          if (isValid) {
            tableData.push([
              formatField('nome', comprovante.nome),
              formatField('valor', comprovante.valor),
              formatField('data', comprovante.data),
              sanitize(comprovante.path),
              formatField('nome', transferencia.nome),
              formatField('valor', transferencia.valor),
              formatField('data', transferencia.data),
              sanitize(transferencia.banco)
            ]);
          } else {
            tableData.push([
              formatField('nome', comprovante.nome),
              formatField('valor', comprovante.valor),
              formatField('data', comprovante.data),
              sanitize(comprovante.path)
            ]);
          }
        });
      });
      return tableData;
    };

    const validData = buildTableData(responseData.validos || [], true);
    const invalidData = buildTableData(responseData.invalidos || [], false);

    const validHeaders = [[
      'Comp. Nome',
      'Comp. Valor',
      'Comp. Data',
      'Comp. Path',
      'Transf. Nome',
      'Transf. Valor',
      'Transf. Data',
      'Transf. Banco'
    ]];

    const invalidHeaders = [[
      'Comp. Nome',
      'Comp. Valor',
      'Comp. Data',
      'Comp. Path'
    ]];

    if (validData.length > 0) {
      doc.text("Válidos", 14, startY);
      autoTable(doc, {
        head: validHeaders,
        body: validData,
        startY: startY + 3,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226], fontSize: 8, cellPadding: 2 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 }
      });
      startY = doc.lastAutoTable.finalY + 5;
    }
    if (invalidData.length > 0) {
      doc.text("Inválidos", 14, startY);
      autoTable(doc, {
        head: invalidHeaders,
        body: invalidData,
        startY: startY + 3,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226], fontSize: 8, cellPadding: 2 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 }
      });
    }
    doc.save("relatorio.pdf");
  };

  // Exibe um label + valor (com sanitização e formatação customizada)
  const renderDetail = (label, value) => {
    let formattedValue = sanitize(value);
    if ((label.includes("Nome") || label.includes("Data")) && formattedValue.trim() === "") {
      formattedValue = "Desconhecido";
    }
    if (label.includes("Valor") && (formattedValue.trim() === "0" || formattedValue.trim() === "0.0")) {
      formattedValue = "Desconhecido";
    }
    return (
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>{label}:</span>
        <span className={styles.detailValue}>{formattedValue}</span>
      </div>
    );
  };

  // Renderiza os resultados na tela.
  // Para registros válidos, exibe tanto os dados do comprovante (sem o campo banco) quanto os da transferência.
  // Para registros inválidos, exibe somente os dados do comprovante.
  // A faixa à esquerda será verde para registros válidos e vermelha para inválidos.
  const renderResults = (registros, isValid = true) => {
    return (
      <>
        {registros.map((item, index) => {
          const pairs = mergeComprovantesTransferencias(
            item.comprovante,
            item.transferencia
          );
          return (
            <div key={index} className={styles.resultCard}>
              <h4>Registro {index + 1}</h4>
              {pairs.map((pair, i) => {
                const { comprovante, transferencia } = pair;
                return (
                  <div
                    key={i}
                    className={`${styles.detailCard} ${isValid ? styles.transferFound : styles.transferNotFound}`}
                  >
                    <h5>Comprovante</h5>
                    {renderDetail("Comp. Nome", comprovante.nome)}
                    {renderDetail("Comp. Valor", comprovante.valor)}
                    {renderDetail("Comp. Data", comprovante.data)}
                    {renderDetail("Comp. Path", comprovante.path)}
                    {isValid && (
                      <>
                        <hr className={styles.separator} />
                        <h5>Transferência</h5>
                        {renderDetail("Transf. Nome", transferencia.nome)}
                        {renderDetail("Transf. Valor", transferencia.valor)}
                        {renderDetail("Transf. Data", transferencia.data)}
                        {renderDetail("Transf. Banco", transferencia.banco)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className={styles.mainWrapper}>
      {isLoading && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            Carregando...
          </div>
        </div>
      )}
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={`${styles.animateItem}`}>Analisar transferencias Pix</h1>
          <p className={`${styles.subtitle} ${styles.animateItem}`}>
            Selecione seus comprovantes e extratos para uma análise.
          </p>
        </header>
        <form className={styles.premiumForm} onSubmit={handleSubmit}>
          <div className={styles.flexContainer}>
            <div className={styles.uploadColumn}>
              <section className={`${styles.card} ${styles.animateItem}`}>
                <h2>Arquivos Individuais</h2>
                <div className={styles.inputGroup}>
                  <label>Corpx (opcional)</label>
                  <label htmlFor="corpx" className={`${styles.customFileButton} ${styles.animateItem}`}>Escolher arquivo</label>
                  <input
                    id="corpx"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'corpx')}
                    accept="*"
                    className={styles.hiddenFileInput}
                  />
                  {files.corpx && <span className={styles.fileName}>{files.corpx.name}</span>}
                </div>
                <div className={styles.inputGroup}>
                  <label>Itau (opcional)</label>
                  <label htmlFor="itau" className={`${styles.customFileButton} ${styles.animateItem}`}>Escolher arquivo</label>
                  <input
                    id="itau"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'itau')}
                    accept="*"
                    className={styles.hiddenFileInput}
                  />
                  {files.itau && <span className={styles.fileName}>{files.itau.name}</span>}
                </div>
                <div className={styles.inputGroup}>
                  <label>Digital (opcional)</label>
                  <label htmlFor="digital" className={`${styles.customFileButton} ${styles.animateItem}`}>Escolher arquivo</label>
                  <input
                    id="digital"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'digital')}
                    accept="*"
                    className={styles.hiddenFileInput}
                  />
                  {files.digital && <span className={styles.fileName}>{files.digital.name}</span>}
                </div>
                <div className={styles.inputGroup}>
                  <label>Generico (opcional)</label>
                  <label htmlFor="generico" className={`${styles.customFileButton} ${styles.animateItem}`}>Escolher arquivo</label>
                  <input
                    id="generico"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'generico')}
                    accept="*"
                    className={styles.hiddenFileInput}
                  />
                  {files.generico && <span className={styles.fileName}>{files.generico.name}</span>}
                </div>
              </section>
              <section className={`${styles.card} ${styles.cardComprovantes} ${styles.animateItem}`}>
                <h2>Comprovantes</h2>
                <label htmlFor="comprovantes" className={`${styles.customFileButton} ${styles.animateItem}`}>Escolher arquivos</label>
                <input
                  type="file"
                  multiple
                  id="comprovantes"
                  onChange={handleMultipleFilesChange}
                  accept="*"
                  className={styles.hiddenFileInput}
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
            <div className={styles.resultColumn}>
              {responseData && (
                <div className={`${styles.responseSection} ${styles.animateItem}`}>
                  {responseData.validos && responseData.validos.length > 0 && (
                    <div className={styles.resultsSection}>
                      <h3>Válidos</h3>
                      {renderResults(responseData.validos, true)}
                    </div>
                  )}
                  {responseData.invalidos && responseData.invalidos.length > 0 && (
                    <div className={styles.resultsSection}>
                      <h3>Inválidos</h3>
                      {renderResults(responseData.invalidos, false)}
                    </div>
                  )}
                </div>
              )}
              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  className={`${styles.submitButton} ${styles.animateItem}`}
                >
                  Enviar Arquivos
                </button>
                <button
                  type="button"
                  className={`${styles.submitButton} ${styles.animateItem}`}
                  onClick={handleGeneratePDF}
                >
                  Gerar Relatório PDF
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
