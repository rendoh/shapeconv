import { useState, useRef } from 'react'
import './App.css'

interface PathCommand {
  command: string
  params: number[]
}

function App() {
  const [svgContent, setSvgContent] = useState<string>('')
  const [shapeResult, setShapeResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseSVGPath = (pathData: string): PathCommand[] => {
    const commands: PathCommand[] = []
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
    let match

    while ((match = regex.exec(pathData)) !== null) {
      const command = match[1]
      const paramString = match[2].trim()
      const params = paramString ? paramString.split(/[\s,]+/).map(Number).filter(n => !isNaN(n)) : []
      commands.push({ command, params })
    }

    return commands
  }

  const convertToShape = (commands: PathCommand[]): string => {
    const shapeParts: string[] = []
    let currentX = 0
    let currentY = 0

    for (const { command, params } of commands) {
      switch (command.toLowerCase()) {
        case 'm':
          if (command === 'M') {
            currentX = params[0]
            currentY = params[1]
          } else {
            currentX += params[0]
            currentY += params[1]
          }
          shapeParts.push(`move to ${currentX}px ${currentY}px`)
          break
        
        case 'l':
          if (command === 'L') {
            currentX = params[0]
            currentY = params[1]
          } else {
            currentX += params[0]
            currentY += params[1]
          }
          shapeParts.push(`line to ${currentX}px ${currentY}px`)
          break
        
        case 'h':
          if (command === 'H') {
            currentX = params[0]
          } else {
            currentX += params[0]
          }
          shapeParts.push(`line to ${currentX}px ${currentY}px`)
          break
        
        case 'v':
          if (command === 'V') {
            currentY = params[0]
          } else {
            currentY += params[0]
          }
          shapeParts.push(`line to ${currentX}px ${currentY}px`)
          break
        
        case 'c':
          if (command === 'C') {
            const cp1x = params[0], cp1y = params[1]
            const cp2x = params[2], cp2y = params[3]
            currentX = params[4]
            currentY = params[5]
            shapeParts.push(`curve to ${currentX}px ${currentY}px via ${cp1x}px ${cp1y}px ${cp2x}px ${cp2y}px`)
          } else {
            const cp1x = currentX + params[0], cp1y = currentY + params[1]
            const cp2x = currentX + params[2], cp2y = currentY + params[3]
            currentX += params[4]
            currentY += params[5]
            shapeParts.push(`curve to ${currentX}px ${currentY}px via ${cp1x}px ${cp1y}px ${cp2x}px ${cp2y}px`)
          }
          break
        
        case 'z':
          shapeParts.push('close')
          break
      }
    }

    return `shape(${shapeParts.join(', ')})`
  }

  const extractPathFromSVG = (svgString: string): string | null => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const pathElement = doc.querySelector('path')
    return pathElement?.getAttribute('d') || null
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.svg')) {
      setError('Please select an SVG file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setSvgContent(content)
      processSVG(content)
    }
    reader.readAsText(file)
  }

  const processSVG = (content: string) => {
    try {
      setError('')
      const pathData = extractPathFromSVG(content)
      
      if (!pathData) {
        setError('No path element found in SVG')
        return
      }

      const commands = parseSVGPath(pathData)
      const shapeValue = convertToShape(commands)
      setShapeResult(shapeValue)
    } catch (err) {
      setError('Error processing SVG: ' + (err as Error).message)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shapeResult)
  }

  return (
    <div className="app">
      <h1>SVG to CSS shape() Converter</h1>
      
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Select SVG File
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {svgContent && (
        <div className="preview-section">
          <h3>SVG Preview:</h3>
          <div className="svg-preview" dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>
      )}

      {shapeResult && (
        <div className="result-section">
          <h3>CSS shape() Result:</h3>
          <div className="result-container">
            <pre className="result">{shapeResult}</pre>
            <button onClick={copyToClipboard}>Copy to Clipboard</button>
          </div>
          
          <div className="usage-example">
            <h4>Usage Example:</h4>
            <pre>{`.element {
  clip-path: ${shapeResult};
}`}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
