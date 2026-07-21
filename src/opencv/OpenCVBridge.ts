// ─── OpenCV Bridge ────────────────────────────────────────────────────────────
// Pure TypeScript replacement for react-native-fast-opencv.
// Implements grayscale conversion, Gaussian blur, Canny-like Sobel edge detection,
// dilation, and Moore-Neighbor boundary tracing for contour detection.
// This completely avoids native CMake C++ compilation issues.
// ─────────────────────────────────────────────────────────────────────────────

export interface MatHandle {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

export interface ContourResult {
  contours: Array<Array<{ x: number; y: number }>>;
}

// ─── Mat Construction ─────────────────────────────────────────────────────────

/**
 * Creates an OpenCV Mat representation from a pixel buffer.
 */
export function bufferToMat(
  buffer: Uint8Array,
  height: number,
  width: number,
  channels: number = 3,
): MatHandle {
  'worklet';
  return {
    data: buffer,
    width,
    height,
    channels,
  };
}

// ─── Color Conversion ────────────────────────────────────────────────────────

/**
 * Converts a BGR Mat to grayscale (luminance).
 */
export function bgrToGray(src: MatHandle): MatHandle {
  'worklet';
  const { data, width, height } = src;
  const dstData = new Uint8Array(width * height);
  const size = width * height;

  for (let i = 0; i < size; i++) {
    const b = data[i * 3];
    const g = data[i * 3 + 1];
    const r = data[i * 3 + 2];
    // Standard luminance weights (integer math)
    dstData[i] = (r * 77 + g * 150 + b * 29) >> 8;
  }

  return {
    data: dstData,
    width,
    height,
    channels: 1,
  };
}

// ─── Smoothing ────────────────────────────────────────────────────────────────

/**
 * Applies a separable 5x5 Gaussian blur.
 */
export function gaussianBlur(src: MatHandle, kernelSize: number = 5): MatHandle {
  'worklet';
  const { data, width, height } = src;
  const temp = new Uint8Array(width * height);
  const dstData = new Uint8Array(width * height);

  // Horizontal pass: kernel [1, 4, 6, 4, 1] / 16
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 2; x < width - 2; x++) {
      const val = (
        data[row + x - 2] +
        (data[row + x - 1] << 2) +
        data[row + x] * 6 +
        (data[row + x + 1] << 2) +
        data[row + x + 2]
      ) >> 4;
      temp[row + x] = val;
    }
    // Copy borders
    temp[row] = data[row];
    temp[row + 1] = data[row + 1];
    temp[row + width - 2] = data[row + width - 2];
    temp[row + width - 1] = data[row + width - 1];
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 2; y < height - 2; y++) {
      const val = (
        temp[(y - 2) * width + x] +
        (temp[(y - 1) * width + x] << 2) +
        temp[y * width + x] * 6 +
        (temp[(y + 1) * width + x] << 2) +
        temp[(y + 2) * width + x]
      ) >> 4;
      dstData[y * width + x] = val;
    }
    // Copy borders
    const offset1 = (height - 2) * width;
    const offset2 = (height - 1) * width;
    dstData[x] = temp[x];
    dstData[width + x] = temp[width + x];
    dstData[offset1 + x] = temp[offset1 + x];
    dstData[offset2 + x] = temp[offset2 + x];
  }

  return {
    data: dstData,
    width,
    height,
    channels: 1,
  };
}

// ─── Edge Detection ───────────────────────────────────────────────────────────

/**
 * Canny-like Sobel threshold edge detector.
 */
export function canny(
  src: MatHandle,
  threshold1: number = 50,
  threshold2: number = 150,
): MatHandle {
  'worklet';
  const { data, width, height } = src;
  const dstData = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    const r0 = (y - 1) * width;
    const r1 = y * width;
    const r2 = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const gX = (
        data[r0 + x + 1] + (data[r1 + x + 1] << 1) + data[r2 + x + 1] -
        (data[r0 + x - 1] + (data[r1 + x - 1] << 1) + data[r2 + x - 1])
      );

      const gY = (
        data[r2 + x - 1] + (data[r2 + x] << 1) + data[r2 + x + 1] -
        (data[r0 + x - 1] + (data[r0 + x] << 1) + data[r0 + x + 1])
      );

      const mag = Math.abs(gX) + Math.abs(gY);

      // Use the higher threshold for binary edge selection
      dstData[r1 + x] = mag > threshold2 ? 255 : 0;
    }
  }

  return {
    data: dstData,
    width,
    height,
    channels: 1,
  };
}

// ─── Morphology ───────────────────────────────────────────────────────────────

/**
 * Dilates edges using a 3x3 rectangular neighborhood.
 */
export function dilate(src: MatHandle, iterations: number = 1): MatHandle {
  'worklet';
  const { data, width, height } = src;
  let currentData = data;

  for (let iter = 0; iter < iterations; iter++) {
    const nextData = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      const r0 = (y - 1) * width;
      const r1 = y * width;
      const r2 = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        if (currentData[r1 + x] === 255) {
          nextData[r1 + x] = 255;
          nextData[r1 + x - 1] = 255;
          nextData[r1 + x + 1] = 255;
          nextData[r0 + x] = 255;
          nextData[r0 + x - 1] = 255;
          nextData[r0 + x + 1] = 255;
          nextData[r2 + x] = 255;
          nextData[r2 + x - 1] = 255;
          nextData[r2 + x + 1] = 255;
        }
      }
    }
    currentData = nextData;
  }

  return {
    data: currentData,
    width,
    height,
    channels: 1,
  };
}

// ─── Contour Detection ────────────────────────────────────────────────────────

/**
 * Finds external contours in a binary image using Moore-Neighbor boundary tracing.
 */
export function findContours(binary: MatHandle): ContourResult {
  'worklet';
  const { data, width, height } = binary;
  
  // Clone to avoid modifying the input matrix data
  const grid = new Uint8Array(data);
  const contours: Array<Array<{ x: number; y: number }>> = [];

  // Clockwise search offsets: North, North-East, East, South-East, South, South-West, West, North-West
  const dirX = [ 0,  1,  1,  1,  0, -1, -1, -1];
  const dirY = [-1, -1,  0,  1,  1,  1,  0, -1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Found an unvisited edge pixel
      if (grid[idx] === 255) {
        const contour: Array<{ x: number; y: number }> = [];
        const startX = x;
        const startY = y;
        
        contour.push({ x: startX, y: startY });
        grid[idx] = 128; // Mark as visited

        let currX = startX;
        let currY = startY;
        let enterDir = 6; // Start searching West (6)
        let foundNext = true;
        let iterations = 0;
        const maxIterations = 2000;

        while (foundNext && iterations++ < maxIterations) {
          let nextX = -1;
          let nextY = -1;
          let nextDir = -1;

          // Search 8-connected neighbors clockwise starting from back-direction
          const scanStart = (enterDir + 6) % 8;
          for (let i = 0; i < 8; i++) {
            const d = (scanStart + i) % 8;
            const nx = currX + dirX[d];
            const ny = currY + dirY[d];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const val = grid[ny * width + nx];
              if (val === 255 || val === 128) {
                nextX = nx;
                nextY = ny;
                nextDir = d;
                break;
              }
            }
          }

          if (nextX !== -1) {
            // Loop completed
            if (nextX === startX && nextY === startY) {
              break;
            }
            
            currX = nextX;
            currY = nextY;
            contour.push({ x: currX, y: currY });
            grid[currY * width + currX] = 128; // Mark as visited
            enterDir = nextDir;
          } else {
            foundNext = false;
          }
        }

        // Filter small contours/noise
        if (contour.length >= 10) {
          contours.push(contour);
        }
      }
    }
  }

  return { contours };
}

// ─── Memory Management ────────────────────────────────────────────────────────

/**
 * Clears allocated buffer memory. No-op for this pure-JS implementation.
 */
export function clearBuffers(): void {
  'worklet';
}

// ─── Polygon Approximation (Douglas-Peucker) ──────────────────────────────────

/**
 * Approximates a contour polygon using the Douglas-Peucker algorithm.
 */
export function approxPolyDP(
  contourPoints: Array<{ x: number; y: number }>,
  epsilonFactor: number = 0.02,
  closed: boolean = true,
): Array<{ x: number; y: number }> {
  'worklet';
  let perimeter = 0;
  const n = contourPoints.length;
  for (let i = 0; i < n; i++) {
    const a = contourPoints[i];
    const b = contourPoints[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  const epsilon = epsilonFactor * perimeter;

  return douglasPeucker(contourPoints, epsilon);
}

/** Pure-JS Douglas-Peucker simplification */
function douglasPeucker(
  points: Array<{ x: number; y: number }>,
  epsilon: number,
): Array<{ x: number; y: number }> {
  'worklet';
  if (points.length <= 2) return points;

  const start = points[0];
  const end   = points[points.length - 1];
  let maxDist = 0;
  let maxIdx  = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx  = i;
    }
  }

  if (maxDist > epsilon) {
    const left  = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

function perpendicularDistance(
  pt: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  'worklet';
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    const ex = pt.x - start.x;
    const ey = pt.y - start.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  return Math.abs(dy * pt.x - dx * pt.y + end.x * start.y - end.y * start.x) / len;
}
