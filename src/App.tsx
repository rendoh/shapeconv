import { useRef, useState } from "react";
import "./App.css";

interface PathCommand {
  command: string;
  params: number[];
}

function App() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [shapeResult, setShapeResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSVGPath = (pathData: string): PathCommand[] => {
    const commands: PathCommand[] = [];

    // パスデータの前処理：負の数の前にスペースを追加
    let cleanedPath = pathData.replace(/([a-zA-Z])(-)/g, "$1 $2");
    cleanedPath = cleanedPath.replace(/(\d)(-)/g, "$1 $2");

    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;

    while ((match = regex.exec(cleanedPath)) !== null) {
      const command = match[1];
      const paramString = match[2].trim();

      // 数値のマッチングを改善（負の数、小数点、連続した数値を含む）
      let cleanParamString = paramString.replace(/([a-zA-Z])/g, " $1 ").trim();
      cleanParamString = cleanParamString.replace(/,/g, " ").replace(
        /\s+/g,
        " ",
      );

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

  const convertToShape = (
    pathDataArray: string[],
    svgDimensions: { width: number; height: number },
  ): string => {
    const shapeParts: string[] = [];
    let currentX = 0;
    let currentY = 0;
    let isFirstMove = true;
    let subpathStartX = 0;
    let subpathStartY = 0;

    const formatCoordinate = (x: number, y: number): string => {
      // アスペクト比を1:1に正規化し、中央配置
      const maxDimension = Math.max(
        svgDimensions.width,
        svgDimensions.height,
      );
      const scaleX = svgDimensions.width / maxDimension;
      const scaleY = svgDimensions.height / maxDimension;

      // 中央配置のためのオフセット計算
      const offsetX = (1 - scaleX) / 2;
      const offsetY = (1 - scaleY) / 2;

      const xPercent = ((x / svgDimensions.width) * scaleX + offsetX) * 100;
      const yPercent = ((y / svgDimensions.height) * scaleY + offsetY) *
        100;
      return `${xPercent.toFixed(2)}% ${yPercent.toFixed(2)}%`;
    };

    // 複数のパスデータを処理
    for (let pathIndex = 0; pathIndex < pathDataArray.length; pathIndex++) {
      const pathData = pathDataArray[pathIndex];
      const commands = parseSVGPath(pathData);
      let pathHasExplicitClose = false;

      for (const { command, params } of commands) {
        switch (command.toLowerCase()) {
          case "m":
            // 最初の座標ペアはfrom/move to、以降はlineto
            for (let i = 0; i < params.length; i += 2) {
              if (i + 1 < params.length) {
                if (command === "M") {
                  currentX = params[i];
                  currentY = params[i + 1];
                } else {
                  currentX += params[i];
                  currentY += params[i + 1];
                }

                if (i === 0) {
                  // 新しいサブパスの開始
                  if (isFirstMove) {
                    shapeParts.push(
                      `from ${formatCoordinate(currentX, currentY)}`,
                    );
                    isFirstMove = false;
                  } else {
                    // 前のパスが明示的に閉じられていない場合の新しいサブパス
                    shapeParts.push(
                      `move to ${formatCoordinate(currentX, currentY)}`,
                    );
                  }
                  subpathStartX = currentX;
                  subpathStartY = currentY;
                } else {
                  shapeParts.push(
                    `line to ${formatCoordinate(currentX, currentY)}`,
                  );
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
                shapeParts.push(
                  `line to ${formatCoordinate(currentX, currentY)}`,
                );
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
              shapeParts.push(
                `line to ${formatCoordinate(currentX, currentY)}`,
              );
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
              shapeParts.push(
                `line to ${formatCoordinate(currentX, currentY)}`,
              );
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
                    `curve to ${formatCoordinate(currentX, currentY)} with ${
                      formatCoordinate(cp1x, cp1y)
                    } / ${formatCoordinate(cp2x, cp2y)}`,
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
                    `curve to ${formatCoordinate(currentX, currentY)} with ${
                      formatCoordinate(cp1x, cp1y)
                    } / ${formatCoordinate(cp2x, cp2y)}`,
                  );
                }
              }
            }
            break;

          case "q":
            // 4つのパラメータごとに2次ベジェ曲線を処理
            for (let i = 0; i < params.length; i += 4) {
              if (i + 3 < params.length) {
                if (command === "Q") {
                  const cpx = params[i], cpy = params[i + 1];
                  currentX = params[i + 2];
                  currentY = params[i + 3];
                  shapeParts.push(
                    `curve to ${formatCoordinate(currentX, currentY)} with ${
                      formatCoordinate(cpx, cpy)
                    }`,
                  );
                } else {
                  const cpx = currentX + params[i];
                  const cpy = currentY + params[i + 1];
                  const endX = currentX + params[i + 2];
                  const endY = currentY + params[i + 3];
                  currentX = endX;
                  currentY = endY;
                  shapeParts.push(
                    `curve to ${formatCoordinate(currentX, currentY)} with ${
                      formatCoordinate(cpx, cpy)
                    }`,
                  );
                }
              }
            }
            break;

          case "z":
            shapeParts.push("close");
            pathHasExplicitClose = true;
            // Z コマンドは現在位置をサブパス開始位置に戻す
            currentX = subpathStartX;
            currentY = subpathStartY;
            break;
        }
      }

      // パスが明示的に閉じられていない場合、暗黙的にcloseを追加
      if (!pathHasExplicitClose && commands.length > 0) {
        shapeParts.push("close");
      }
    }

    return `shape(${shapeParts.join(", ")})`;
  };

  const convertBasicShapeToPath = (element: Element): string | null => {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case "rect": {
        const x = parseFloat(element.getAttribute("x") || "0");
        const y = parseFloat(element.getAttribute("y") || "0");
        const width = parseFloat(element.getAttribute("width") || "0");
        const height = parseFloat(element.getAttribute("height") || "0");
        const rx = parseFloat(element.getAttribute("rx") || "0");
        const ry = parseFloat(element.getAttribute("ry") || rx.toString());

        if (rx === 0 && ry === 0) {
          // 角丸なしの長方形
          return `M${x},${y} L${x + width},${y} L${x + width},${
            y + height
          } L${x},${y + height} Z`;
        } else {
          // 角丸長方形（簡略化）
          const r = Math.min(rx, ry, width / 2, height / 2);
          return `M${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${
            x + width
          },${y + r} L${x + width},${y + height - r} Q${x + width},${
            y + height
          } ${x + width - r},${y + height} L${x + r},${y + height} Q${x},${
            y + height
          } ${x},${y + height - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`;
        }
      }

      case "circle": {
        const cx = parseFloat(element.getAttribute("cx") || "0");
        const cy = parseFloat(element.getAttribute("cy") || "0");
        const r = parseFloat(element.getAttribute("r") || "0");

        // 円を4つの3次ベジェ曲線で近似
        const k = 0.552284749831; // 円に近似するベジェ曲線の制御点係数
        const kr = k * r;
        return `M${cx},${cy - r} C${cx + kr},${cy - r} ${cx + r},${cy - kr} ${
          cx + r
        },${cy} C${cx + r},${cy + kr} ${cx + kr},${cy + r} ${cx},${cy + r} C${
          cx - kr
        },${cy + r} ${cx - r},${cy + kr} ${cx - r},${cy} C${cx - r},${
          cy - kr
        } ${cx - kr},${cy - r} ${cx},${cy - r} Z`;
      }

      case "ellipse": {
        const cx = parseFloat(element.getAttribute("cx") || "0");
        const cy = parseFloat(element.getAttribute("cy") || "0");
        const rx = parseFloat(element.getAttribute("rx") || "0");
        const ry = parseFloat(element.getAttribute("ry") || "0");

        const k = 0.552284749831;
        const krx = k * rx;
        const kry = k * ry;
        return `M${cx},${cy - ry} C${cx + krx},${cy - ry} ${cx + rx},${
          cy - kry
        } ${cx + rx},${cy} C${cx + rx},${cy + kry} ${cx + krx},${
          cy + ry
        } ${cx},${cy + ry} C${cx - krx},${cy + ry} ${cx - rx},${cy + kry} ${
          cx - rx
        },${cy} C${cx - rx},${cy - kry} ${cx - krx},${cy - ry} ${cx},${
          cy - ry
        } Z`;
      }

      case "polygon": {
        const points = element.getAttribute("points");
        if (!points) return null;

        const coords = points.trim().split(/[\s,]+/).map(Number);
        if (coords.length < 4) return null;

        let path = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          path += ` L${coords[i]},${coords[i + 1]}`;
        }
        path += " Z";
        return path;
      }

      case "polyline": {
        const points = element.getAttribute("points");
        if (!points) return null;

        const coords = points.trim().split(/[\s,]+/).map(Number);
        if (coords.length < 4) return null;

        let path = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          path += ` L${coords[i]},${coords[i + 1]}`;
        }
        // polylineはデフォルトで閉じない
        return path;
      }

      default:
        return null;
    }
  };

  const extractPathsFromSVG = (svgString: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const paths: string[] = [];

    // path要素を処理
    const pathElements = doc.querySelectorAll("path");
    pathElements.forEach((pathElement) => {
      const pathData = pathElement.getAttribute("d");
      if (pathData) {
        paths.push(pathData);
      }
    });

    // 基本図形要素を処理
    const shapeElements = doc.querySelectorAll(
      "rect, circle, ellipse, polygon, polyline",
    );
    shapeElements.forEach((shapeElement) => {
      const pathData = convertBasicShapeToPath(shapeElement);
      if (pathData) {
        paths.push(pathData);
      }
    });

    return paths;
  };

  const getSVGDimensions = (
    svgString: string,
  ): { width: number; height: number } => {
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
      setFileName(file.name);
      setSvgContent(content);
      processSVG(content);
    };
    reader.readAsText(file);
  };

  const processSVG = (content: string) => {
    try {
      setError("");
      const pathDataArray = extractPathsFromSVG(content);

      if (pathDataArray.length === 0) {
        setError("No path elements found in SVG");
        return;
      }

      const svgDimensions = getSVGDimensions(content);
      const shapeValue = convertToShape(pathDataArray, svgDimensions);
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
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {svgContent && (
        <div className="preview-section">
          <h3>SVG Preview: {fileName}</h3>
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
            <pre>{`:root {
  --icon-${fileName.replace(".svg", "")}: ${shapeResult};
}
.element {
  clip-path: var(--icon-${fileName.replace(".svg", "")});
  width: 1em;
  height: 1em;
  background: currentColor;
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
