with open("app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re

old_func = r'''  const downloadPdf = async \(reportId: string, index: number\) => \{
    const element = document\.getElementById\(`report-\$\{reportId\}`\)
    if \(!element\) return
    try \{
      const \{ default: html2canvas \} = await import\('html2canvas'\)
      const jspdfModule = await import\('jspdf'\)
      const jsPDF = jspdfModule\.default \|\| jspdfModule\.jsPDF
      const canvas = await html2canvas\(element, \{ scale: 2, useCORS: true \}\)
      const imgData = canvas\.toDataURL\('image/png'\)
      const pdf = new jsPDF\('p', 'mm', 'a4'\)
      const pdfWidth = pdf\.internal\.pageSize\.getWidth\(\)
      const pdfHeight = \(canvas\.height \* pdfWidth\) / canvas\.width
      pdf\.addImage\(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight\)
      pdf\.save\(`Report_\$\{patient\?\.name\?\.replace\(/\\s\+/g, '_'\) \|\| 'Patient'\}_\$\{index === 0 \? "Latest" : index\}\.pdf`\)
    \} catch \(e\) \{
      console\.error\("Failed to generate PDF", e\)
    \}
  \}'''

new_func = r'''  const downloadPdf = async (reportId: string, index: number) => {
    const element = document.getElementById(`report-${reportId}`)
    if (!element) return
    try {
      const { toPng } = await import('html-to-image')
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default || jspdfModule.jsPDF

      const imgData = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const pdf = new jsPDF('p', 'mm', 'a4')

      const img = new Image()
      img.onload = () => {
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (img.height * pdfWidth) / img.width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`Report_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}_${index === 0 ? "Latest" : index}.pdf`)
      }
      img.src = imgData
      
    } catch (e) {
      console.error("Failed to generate PDF", e)
    }
  }'''

text = re.sub(old_func, new_func.replace('\\', '\\\\'), text)

with open("app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

