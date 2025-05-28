import { useRef, useState } from "react";
import "./App.css";

interface PathCommand {
  command: string;
  params: number[];
}

function App() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [shapeResult, setShapeResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [usePercentage, setUsePercentage] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSVGPath = (pathData: string): PathCommand[] => {
    const commands: PathCommand[] = [];
    
    // パスデータの前処理：負の数の前にスペースを追加
    let cleanedPath = pathData.replace(/([a-zA-Z])(-)/g, '$1 $2');
    cleanedPath = cleanedPath.replace(/(\d)(-)/g, '$1 $2');
    
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;

    while ((match = regex.exec(cleanedPath)) !== null) {
      const command = match[1];
      const paramString = match[2].trim();

      // 数値のマッチングを改善（負の数、小数点、連続した数値を含む）
      let cleanParamString = paramString.replace(/([a-zA-Z])/g, ' $1 ').trim();
      cleanParamString = cleanParamString.replace(/,/g, ' ').replace(/\s+/g, ' ');
      
      const numberRegex = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
      const params: number[] = [];
      let numberMatch;

      while ((numberMatch = numberRegex.exec(cleanParamString)) !== null) {
        const num = parseFloat(numberMatch[0]);
        if (!isNaN(num)) {
          params.push(num);
        }
      }

      commands.push({ command, params });
    }

    return commands;
  };

  const convertToShape = (commands: PathCommand[], svgDimensions: { width: number; height: number }): string => {
    const shapeParts: string[] = [];
    let currentX = 0;
    let currentY = 0;
    let isFirstMove = true;

    const formatCoordinate = (x: number, y: number): string => {
      if (usePercentage) {
        const xPercent = (x / svgDimensions.width * 100).toFixed(2);
        const yPercent = (y / svgDimensions.height * 100).toFixed(2);
        return `${xPercent}% ${yPercent}%`;
      } else {
        return `${x}px ${y}px`;
      }
    };

    for (const { command, params } of commands) {
      switch (command.toLowerCase()) {
        case "m":
          // 最初の座標ペアはfrom、以降はlineto
          for (let i = 0; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              if (command === "M") {
                currentX = params[i];
                currentY = params[i + 1];
              } else {
                currentX += params[i];
                currentY += params[i + 1];
              }

              if (i === 0 && isFirstMove) {
                shapeParts.push(`from ${formatCoordinate(currentX, currentY)}`);
                isFirstMove = false;
              } else {
                shapeParts.push(`line to ${formatCoordinate(currentX, currentY)}`);
              }
            }
          }
          break;

        case "l":
          // 2つのパラメータごとにlinetoコマンドを処理
          for (let i = 0; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              if (command === "L") {
                currentX = params[i];
                currentY = params[i + 1];
              } else {
                currentX += params[i];
                currentY += params[i + 1];
              }
              shapeParts.push(`line to ${formatCoordinate(currentX, currentY)}`);
            }
          }
          break;

        case "h":
          // 水平線の複数値を処理
          for (const param of params) {
            if (command === "H") {
              currentX = param;
            } else {
              currentX += param;
            }
            shapeParts.push(`line to ${formatCoordinate(currentX, currentY)}`);
          }
          break;

        case "v":
          // 垂直線の複数値を処理
          for (const param of params) {
            if (command === "V") {
              currentY = param;
            } else {
              currentY += param;
            }
            shapeParts.push(`line to ${formatCoordinate(currentX, currentY)}`);
          }
          break;

        case "c":
          // 6つのパラメータごとにcurvetoコマンドを処理
          for (let i = 0; i < params.length; i += 6) {
            if (i + 5 < params.length) {
              if (command === "C") {
                const cp1x = params[i], cp1y = params[i + 1];
                const cp2x = params[i + 2], cp2y = params[i + 3];
                currentX = params[i + 4];
                currentY = params[i + 5];
                shapeParts.push(
                  `curve to ${formatCoordinate(currentX, currentY)} with ${formatCoordinate(cp1x, cp1y)} / ${formatCoordinate(cp2x, cp2y)}`,
                );
              } else {
                const cp1x = currentX + params[i];
                const cp1y = currentY + params[i + 1];
                const cp2x = currentX + params[i + 2];
                const cp2y = currentY + params[i + 3];
                const endX = currentX + params[i + 4];
                const endY = currentY + params[i + 5];
                currentX = endX;
                currentY = endY;
                shapeParts.push(
                  `curve to ${formatCoordinate(currentX, currentY)} with ${formatCoordinate(cp1x, cp1y)} / ${formatCoordinate(cp2x, cp2y)}`,
                );
              }
            }
          }
          break;

        case "z":
          shapeParts.push("close");
          break;
      }
    }

    return `shape(${shapeParts.join(", ")})`;
  };

  const extractPathFromSVG = (svgString: string): string | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const pathElement = doc.querySelector("path");
    return pathElement?.getAttribute("d") || null;
  };

  const getSVGDimensions = (svgString: string): { width: number; height: number } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.querySelector("svg");
    
    if (!svgElement) return { width: 100, height: 100 };

    // viewBoxから寸法を取得
    const viewBox = svgElement.getAttribute("viewBox");
    if (viewBox) {
      const [, , width, height] = viewBox.split(/\s+/).map(Number);
      return { width, height };
    }

    // width/height属性から取得
    const width = parseFloat(svgElement.getAttribute("width") || "100");
    const height = parseFloat(svgElement.getAttribute("height") || "100");
    
    return { width, height };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".svg")) {
      setError("Please select an SVG file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSvgContent(content);
      processSVG(content);
    };
    reader.readAsText(file);
  };

  const processSVG = (content: string) => {
    try {
      setError("");
      const pathData = extractPathFromSVG(content);

      if (!pathData) {
        setError("No path element found in SVG");
        return;
      }

      console.log("Original path data:", pathData);
      const commands = parseSVGPath(pathData);
      console.log("Parsed commands:", commands);
      const svgDimensions = getSVGDimensions(content);
      console.log("SVG dimensions:", svgDimensions);
      const shapeValue = convertToShape(commands, svgDimensions);
      setShapeResult(shapeValue);
    } catch (err) {
      setError("Error processing SVG: " + (err as Error).message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shapeResult);
  };

  return (
    <div className="app">
      <h1>SVG to CSS shape() Converter</h1>

      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Select SVG File
        </button>
        
        <div className="unit-toggle">
          <label>
            <input
              type="checkbox"
              checked={usePercentage}
              onChange={(e) => {
                setUsePercentage(e.target.checked);
                if (svgContent) {
                  processSVG(svgContent);
                }
              }}
            />
            Use percentage units (responsive)
          </label>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {svgContent && (
        <div className="preview-section">
          <h3>SVG Preview:</h3>
          <div
            className="svg-preview"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
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

          <div className="preview-clippath">
            <h4>Clip-path Preview:</h4>
            <div className="clippath-demo-container">
              <div 
                className="clippath-demo"
                style={{
                  clipPath: shapeResult,
                }}
              />
              <div className="clippath-overlay">
                <div 
                  className="clippath-outline"
                  style={{
                    clipPath: shapeResult,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
