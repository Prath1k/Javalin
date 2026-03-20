import React, { useState, useEffect, useRef } from 'react';
import './SortViz.css';

const ARRAY_SIZE = 40;

const SortViz = () => {
  const [array, setArray] = useState([]);
  const [isSorting, setIsSorting] = useState(false);
  const [activeIndices, setActiveIndices] = useState([]);
  const [sortedIndices, setSortedIndices] = useState([]);
  const [speedMs, setSpeedMs] = useState(30);
  const [comparisons, setComparisons] = useState(0);
  const [swaps, setSwaps] = useState(0);
  const [currentAlgo, setCurrentAlgo] = useState('');
  const stopRef = useRef(false);

  const generateArray = () => {
    if (isSorting) return;
    const newArr = Array.from({ length: ARRAY_SIZE }, () => Math.floor(Math.random() * 80) + 10);
    setArray(newArr);
    setActiveIndices([]);
    setSortedIndices([]);
    setComparisons(0);
    setSwaps(0);
    setCurrentAlgo('');
  };

  useEffect(() => { generateArray(); }, []);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const successSweep = async (arr) => {
    for (let i = 0; i < arr.length; i++) {
      setActiveIndices([i]);
      await sleep(10);
    }
    setActiveIndices([]);
  };

  // Bubble Sort
  const bubbleSort = async () => {
    if (isSorting) return;
    setIsSorting(true); setCurrentAlgo('BUBBLE'); setComparisons(0); setSwaps(0); stopRef.current = false;
    let arr = [...array]; let sorted = []; let cmp = 0; let sw = 0;
    for (let i = 0; i < arr.length - 1 && !stopRef.current; i++) {
      for (let j = 0; j < arr.length - i - 1 && !stopRef.current; j++) {
        setActiveIndices([j, j + 1]); cmp++; setComparisons(cmp);
        await sleep(speedMs);
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          sw++; setSwaps(sw); setArray([...arr]);
        }
      }
      sorted.push(arr.length - 1 - i); setSortedIndices([...sorted]);
    }
    sorted.push(0); setSortedIndices([...sorted]); setActiveIndices([]); setIsSorting(false);
    if (!stopRef.current) await successSweep(arr);
  };

  // Selection Sort
  const selectionSort = async () => {
    if (isSorting) return;
    setIsSorting(true); setCurrentAlgo('SELECTION'); setComparisons(0); setSwaps(0); stopRef.current = false;
    let arr = [...array]; let sorted = []; let cmp = 0; let sw = 0;
    for (let i = 0; i < arr.length && !stopRef.current; i++) {
      let minIdx = i;
      for (let j = i + 1; j < arr.length && !stopRef.current; j++) {
        setActiveIndices([minIdx, j]); cmp++; setComparisons(cmp);
        await sleep(speedMs);
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        sw++; setSwaps(sw); setArray([...arr]);
      }
      sorted.push(i); setSortedIndices([...sorted]);
    }
    setActiveIndices([]); setIsSorting(false);
    if (!stopRef.current) await successSweep(arr);
  };

  // Quick Sort
  const quickSort = async () => {
    if (isSorting) return;
    setIsSorting(true); setCurrentAlgo('QUICK'); setComparisons(0); setSwaps(0); stopRef.current = false;
    let arr = [...array]; let cmp = 0; let sw = 0; let sorted = [];

    const partition = async (low, high) => {
      const pivot = arr[high];
      let i = low - 1;
      for (let j = low; j < high && !stopRef.current; j++) {
        setActiveIndices([j, high]); cmp++; setComparisons(cmp);
        await sleep(speedMs);
        if (arr[j] < pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          sw++; setSwaps(sw); setArray([...arr]);
        }
      }
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      sw++; setSwaps(sw); setArray([...arr]);
      sorted.push(i + 1); setSortedIndices([...sorted]);
      return i + 1;
    };

    const qs = async (low, high) => {
      if (low < high && !stopRef.current) {
        const pi = await partition(low, high);
        await qs(low, pi - 1);
        await qs(pi + 1, high);
      }
    };

    await qs(0, arr.length - 1);
    setSortedIndices(Array.from({ length: arr.length }, (_, i) => i));
    setActiveIndices([]); setIsSorting(false);
    if (!stopRef.current) await successSweep(arr);
  };

  // Merge Sort
  const mergeSort = async () => {
    if (isSorting) return;
    setIsSorting(true); setCurrentAlgo('MERGE'); setComparisons(0); setSwaps(0); stopRef.current = false;
    let arr = [...array]; let cmp = 0; let sw = 0;

    const merge = async (l, m, r) => {
      let L = arr.slice(l, m + 1);
      let R = arr.slice(m + 1, r + 1);
      let i = 0, j = 0, k = l;
      while (i < L.length && j < R.length && !stopRef.current) {
        setActiveIndices([k]); cmp++; setComparisons(cmp);
        await sleep(speedMs);
        if (L[i] <= R[j]) { arr[k] = L[i]; i++; } 
        else { arr[k] = R[j]; j++; }
        sw++; setSwaps(sw); setArray([...arr]); k++;
      }
      while (i < L.length && !stopRef.current) { arr[k] = L[i]; i++; k++; setArray([...arr]); await sleep(speedMs); }
      while (j < R.length && !stopRef.current) { arr[k] = R[j]; j++; k++; setArray([...arr]); await sleep(speedMs); }
    };

    const ms = async (l, r) => {
      if (l < r && !stopRef.current) {
        const m = Math.floor((l + r) / 2);
        await ms(l, m);
        await ms(m + 1, r);
        await merge(l, m, r);
      }
    };

    await ms(0, arr.length - 1);
    setSortedIndices(Array.from({ length: arr.length }, (_, i) => i));
    setActiveIndices([]); setIsSorting(false);
    if (!stopRef.current) await successSweep(arr);
  };

  return (
    <div className="sort-viz-container">
      <div className="sort-header">
        <div className="sort-header-left">
          <h2 className="sort-title">ALGO_VIZ</h2>
          {currentAlgo && <span className="algo-badge">{currentAlgo}</span>}
        </div>
        <div className="sort-controls">
          <button className="sort-btn generate-btn" onClick={generateArray} disabled={isSorting}>RANDOMIZE</button>
          <button className="sort-btn algo-btn" onClick={bubbleSort} disabled={isSorting}>BUBBLE</button>
          <button className="sort-btn algo-btn" onClick={selectionSort} disabled={isSorting}>SELECTION</button>
          <button className="sort-btn algo-btn algo-btn-alt" onClick={quickSort} disabled={isSorting}>QUICK</button>
          <button className="sort-btn algo-btn algo-btn-alt" onClick={mergeSort} disabled={isSorting}>MERGE</button>
        </div>
      </div>

      {/* Speed slider & stats */}
      <div className="sort-meta">
        <div className="speed-control">
          <label className="speed-label">SPEED</label>
          <input
            type="range"
            min="5"
            max="100"
            value={100 - speedMs}
            onChange={(e) => setSpeedMs(100 - Number(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-val">{Math.round((1 - speedMs / 100) * 100)}%</span>
        </div>
        <div className="sort-stats">
          <div className="sort-stat"><span>CMP</span><strong>{comparisons}</strong></div>
          <div className="sort-stat"><span>SWP</span><strong>{swaps}</strong></div>
        </div>
      </div>

      <div className="array-container">
        {array.map((value, idx) => {
          let background = '#3b82f6';
          if (sortedIndices.includes(idx)) background = '#10b981';
          if (activeIndices.includes(idx)) background = '#f43f5e';

          return (
            <div
              className="array-bar"
              key={idx}
              style={{
                height: `${value}%`,
                background: background,
                boxShadow: `0 0 10px ${background}88`
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SortViz;
