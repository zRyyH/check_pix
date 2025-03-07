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

  // Gera PDF unindo comprovante + transferência no mesmo bloco e removendo a coluna "Registro"
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

    const buildTableData = (registros) => {
      const tableData = [];
      registros.forEach((item) => {
        const pairs = mergeComprovantesTransferencias(
          item.comprovante,
          item.transferencia
        );
        pairs.forEach(({ comprovante, transferencia }) => {
          tableData.push([
            sanitize(comprovante.nome),
            sanitize(comprovante.valor),
            sanitize(comprovante.data),
            sanitize(comprovante.banco),
            sanitize(transferencia.nome),
            sanitize(transferencia.valor),
            sanitize(transferencia.data),
            sanitize(transferencia.banco),
          ]);
        });
      });
      return tableData;
    };

    const validData = buildTableData(responseData.validos || []);
    const invalidData = buildTableData(responseData.invalidos || []);

    const tableHeaders = [[
      'Comp. Nome',
      'Comp. Valor',
      'Comp. Data',
      'Comp. Banco',
      'Transf. Nome',
      'Transf. Valor',
      'Transf. Data',
      'Transf. Banco'
    ]];

    if (validData.length > 0) {
      doc.text("Válidos", 14, startY);
      autoTable(doc, {
        head: tableHeaders,
        body: validData,
        startY: startY + 4,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226] },
      });
      startY = doc.lastAutoTable.finalY + 10;
    }
    if (invalidData.length > 0) {
      doc.text("Inválidos", 14, startY);
      autoTable(doc, {
        head: tableHeaders,
        body: invalidData,
        startY: startY + 4,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 226] },
      });
    }
    doc.save("relatorio.pdf");
  };

  // Exibe um label + valor (com sanitização)
  const renderDetail = (label, value) => (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}:</span>
      <span className={styles.detailValue}>{sanitize(value)}</span>
    </div>
  );

  // Renderiza os resultados na tela, separando Comprovante e Transferência
  const renderResults = (registros) => {
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
                const transferFound = transferencia && transferencia.nome && transferencia.nome.trim() !== "";
                return (
                  <div
                    key={i}
                    className={`${styles.detailCard} ${transferFound ? styles.transferFound : styles.transferNotFound}`}
                  >
                    <h5>Comprovante</h5>
                    {renderDetail("Comp. Nome", comprovante.nome)}
                    {renderDetail("Comp. Valor", comprovante.valor)}
                    {renderDetail("Comp. Data", comprovante.data)}
                    {renderDetail("Comp. Banco", comprovante.banco)}

                    <hr className={styles.separator} />

                    <h5>Transferência</h5>
                    {renderDetail("Transf. Nome", transferencia.nome)}
                    {renderDetail("Transf. Valor", transferencia.valor)}
                    {renderDetail("Transf. Data", transferencia.data)}
                    {renderDetail("Transf. Banco", transferencia.banco)}
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
                      {renderResults(responseData.validos)}
                    </div>
                  )}
                  {responseData.invalidos && responseData.invalidos.length > 0 && (
                    <div className={styles.resultsSection}>
                      <h3>Inválidos</h3>
                      {renderResults(responseData.invalidos)}
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
