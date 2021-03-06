// Utilities extracted from https://github.com/bvaughn/react-window
import {
  ItemSizer,
  InstanceInterface,
  AreaProps,
  CellInterface,
  CellMetaData,
  SelectionArea,
} from "./Grid";
import { Direction } from "./types";

export enum Align {
  start = "start",
  end = "end",
  center = "center",
  auto = "auto",
  smart = "smart",
}

export enum ItemType {
  row = "row",
  column = "column",
}

export interface IItemMetaData {
  itemType: ItemType;
  offset: number;
  index: number;
  rowCount: number;
  columnCount: number;
  rowHeight: ItemSizer;
  columnWidth: ItemSizer;
  instanceProps: InstanceInterface;
}

export const getRowStartIndexForOffset = ({
  rowHeight,
  columnWidth,
  rowCount,
  columnCount,
  instanceProps,
  offset,
}: Omit<IItemMetaData, "index" | "itemType">): number => {
  return findNearestItem({
    itemType: ItemType.row,
    rowHeight,
    columnWidth,
    rowCount,
    columnCount,
    instanceProps,
    offset,
  });
};

interface IRowStopIndex
  extends Omit<IItemMetaData, "itemType" | "index" | "offset" | "columnCount"> {
  startIndex: number;
  containerHeight: number;
  scrollTop: number;
}
export const getRowStopIndexForStartIndex = ({
  startIndex,
  rowCount,
  rowHeight,
  columnWidth,
  scrollTop,
  containerHeight,
  instanceProps,
}: IRowStopIndex): number => {
  const itemMetadata = getItemMetadata({
    itemType: ItemType.row,
    rowHeight,
    columnWidth,
    index: startIndex,
    instanceProps,
  });
  const maxOffset = scrollTop + containerHeight;

  let offset = itemMetadata.offset + itemMetadata.size;
  let stopIndex = startIndex;

  while (stopIndex < rowCount - 1 && offset < maxOffset) {
    stopIndex++;
    offset += getItemMetadata({
      itemType: ItemType.row,
      rowHeight,
      columnWidth,
      index: stopIndex,
      instanceProps,
    }).size;
  }

  return stopIndex;
};

export const getColumnStartIndexForOffset = ({
  rowHeight,
  columnWidth,
  rowCount,
  columnCount,
  instanceProps,
  offset,
}: Omit<IItemMetaData, "index" | "itemType">): number => {
  return findNearestItem({
    itemType: ItemType.column,
    rowHeight,
    columnWidth,
    rowCount,
    columnCount,
    instanceProps,
    offset,
  });
};

interface IColumnStopIndex
  extends Omit<IItemMetaData, "itemType" | "index" | "offset" | "rowCount"> {
  startIndex: number;
  containerWidth: number;
  scrollLeft: number;
}
export const getColumnStopIndexForStartIndex = ({
  startIndex,
  rowHeight,
  columnWidth,
  instanceProps,
  containerWidth,
  scrollLeft,
  columnCount,
}: IColumnStopIndex): number => {
  const itemMetadata = getItemMetadata({
    itemType: ItemType.column,
    index: startIndex,
    rowHeight,
    columnWidth,
    instanceProps,
  });
  const maxOffset = scrollLeft + containerWidth;

  let offset = itemMetadata.offset + itemMetadata.size;
  let stopIndex = startIndex;

  while (stopIndex < columnCount - 1 && offset < maxOffset) {
    stopIndex++;
    offset += getItemMetadata({
      itemType: ItemType.column,
      rowHeight,
      columnWidth,
      index: stopIndex,
      instanceProps,
    }).size;
  }

  return stopIndex;
};

export const getBoundedCells = (area: AreaProps | null | undefined) => {
  const cells = new Set();
  if (!area) return cells;
  const { top, bottom, left, right } = area;
  for (let i = top; i <= bottom; i++) {
    for (let j = left; j <= right; j++) {
      cells.add(cellIndentifier(i, j));
    }
  }
  return cells;
};

export const itemKey = ({ rowIndex, columnIndex }: CellInterface) =>
  `${rowIndex}:${columnIndex}`;

export const getRowOffset = ({
  index,
  rowHeight,
  columnWidth,
  instanceProps,
}: Omit<IGetItemMetadata, "itemType">): number => {
  return getItemMetadata({
    itemType: ItemType.row,
    index,
    rowHeight,
    columnWidth,
    instanceProps,
  }).offset;
};

export const getColumnOffset = ({
  index,
  rowHeight,
  columnWidth,
  instanceProps,
}: Omit<IGetItemMetadata, "itemType">): number => {
  return getItemMetadata({
    itemType: ItemType.column,
    index,
    rowHeight,
    columnWidth,
    instanceProps,
  }).offset;
};

export const getRowHeight = (
  index: number,
  instanceProps: InstanceInterface
) => {
  return instanceProps.rowMetadataMap[index].size;
};

export const getColumnWidth = (
  index: number,
  instanceProps: InstanceInterface
) => {
  return instanceProps.columnMetadataMap[index].size;
};

interface IGetItemMetadata
  extends Pick<
    IItemMetaData,
    "itemType" | "index" | "rowHeight" | "columnWidth" | "instanceProps"
  > {}
export const getItemMetadata = ({
  itemType,
  index,
  rowHeight,
  columnWidth,
  instanceProps,
}: IGetItemMetadata): CellMetaData => {
  let itemMetadataMap, itemSize, lastMeasuredIndex, recalcIndices: number[];
  if (itemType === "column") {
    itemMetadataMap = instanceProps.columnMetadataMap;
    itemSize = columnWidth;
    lastMeasuredIndex = instanceProps.lastMeasuredColumnIndex;
    recalcIndices = instanceProps.recalcColumnIndices;
  } else {
    itemMetadataMap = instanceProps.rowMetadataMap;
    itemSize = rowHeight;
    lastMeasuredIndex = instanceProps.lastMeasuredRowIndex;
    recalcIndices = instanceProps.recalcRowIndices;
  }
  const recalcWithinBoundsOnly = recalcIndices.length > 0;
  if (index > lastMeasuredIndex) {
    let offset = 0;
    if (lastMeasuredIndex >= 0) {
      const itemMetadata = itemMetadataMap[lastMeasuredIndex];
      offset = itemMetadata.offset + itemMetadata.size;
    }

    for (let i = lastMeasuredIndex + 1; i <= index; i++) {
      // Only recalculates specified columns
      let size = recalcWithinBoundsOnly
        ? recalcIndices.includes(i)
          ? itemSize(i)
          : itemMetadataMap[i]?.size || itemSize(i)
        : itemSize(i);

      itemMetadataMap[i] = {
        offset,
        size,
      };

      offset += size;
    }

    if (itemType === "column") {
      instanceProps.lastMeasuredColumnIndex = index;
    } else {
      instanceProps.lastMeasuredRowIndex = index;
    }
  }

  return itemMetadataMap[index];
};

const findNearestItem = ({
  itemType,
  rowHeight,
  columnWidth,
  rowCount,
  columnCount,
  instanceProps,
  offset,
}: Omit<IItemMetaData, "index">): number => {
  let itemMetadataMap, lastMeasuredIndex;
  if (itemType === "column") {
    itemMetadataMap = instanceProps.columnMetadataMap;
    lastMeasuredIndex = instanceProps.lastMeasuredColumnIndex;
  } else {
    itemMetadataMap = instanceProps.rowMetadataMap;
    lastMeasuredIndex = instanceProps.lastMeasuredRowIndex;
  }

  const lastMeasuredItemOffset =
    lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;
  if (lastMeasuredItemOffset >= offset) {
    // If we've already measured items within this range just use a binary search as it's faster.
    return findNearestItemBinarySearch({
      itemType,
      rowHeight,
      columnWidth,
      instanceProps,
      high: lastMeasuredIndex,
      low: 0,
      offset,
    });
  } else {
    // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
    // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
    // The overall complexity for this approach is O(log n).
    return findNearestItemExponentialSearch({
      itemType,
      rowHeight,
      rowCount,
      columnCount,
      columnWidth,
      instanceProps,
      index: Math.max(0, lastMeasuredIndex),
      offset,
    });
  }
};

interface IBinarySearchArgs
  extends Omit<IItemMetaData, "index" | "rowCount" | "columnCount"> {
  high: number;
  low: number;
}
const findNearestItemBinarySearch = ({
  itemType,
  rowHeight,
  columnWidth,
  instanceProps,
  high,
  low,
  offset,
}: IBinarySearchArgs): number => {
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const currentOffset = getItemMetadata({
      itemType,
      rowHeight,
      columnWidth,
      index: middle,
      instanceProps,
    }).offset;

    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

const findNearestItemExponentialSearch = ({
  itemType,
  rowHeight,
  columnWidth,
  rowCount,
  columnCount,
  instanceProps,
  index,
  offset,
}: IItemMetaData) => {
  const itemCount = itemType === "column" ? columnCount : rowCount;
  let interval = 1;

  while (
    index < itemCount &&
    getItemMetadata({
      itemType,
      rowHeight,
      columnWidth,
      index,
      instanceProps,
    }).offset < offset
  ) {
    index += interval;
    interval *= 2;
  }

  return findNearestItemBinarySearch({
    itemType,
    rowHeight,
    columnWidth,
    instanceProps,
    high: Math.min(index, itemCount - 1),
    low: Math.floor(index / 2),
    offset,
  });
};

export const getEstimatedTotalHeight = (
  rowCount: number,
  instanceProps: InstanceInterface
) => {
  const { estimatedRowHeight } = instanceProps;
  let totalSizeOfMeasuredRows = 0;
  let { lastMeasuredRowIndex, rowMetadataMap } = instanceProps;

  // Edge case check for when the number of items decreases while a scroll is in progress.
  // https://github.com/bvaughn/react-window/pull/138
  if (lastMeasuredRowIndex >= rowCount) {
    lastMeasuredRowIndex = rowCount - 1;
  }

  if (lastMeasuredRowIndex >= 0) {
    const itemMetadata = rowMetadataMap[lastMeasuredRowIndex];
    totalSizeOfMeasuredRows = itemMetadata.offset + itemMetadata.size;
  }

  const numUnmeasuredItems = rowCount - lastMeasuredRowIndex - 1;
  const totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedRowHeight;

  return totalSizeOfMeasuredRows + totalSizeOfUnmeasuredItems;
};

export const getEstimatedTotalWidth = (
  columnCount: number,
  instanceProps: InstanceInterface
) => {
  const { estimatedColumnWidth } = instanceProps;
  let totalSizeOfMeasuredRows = 0;
  let { lastMeasuredColumnIndex, columnMetadataMap } = instanceProps;
  // Edge case check for when the number of items decreases while a scroll is in progress.
  // https://github.com/bvaughn/react-window/pull/138
  if (lastMeasuredColumnIndex >= columnCount) {
    lastMeasuredColumnIndex = columnCount - 1;
  }

  if (lastMeasuredColumnIndex >= 0) {
    const itemMetadata = columnMetadataMap[lastMeasuredColumnIndex];
    totalSizeOfMeasuredRows = itemMetadata.offset + itemMetadata.size;
  }

  const numUnmeasuredItems = columnCount - lastMeasuredColumnIndex - 1;
  const totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedColumnWidth;

  return totalSizeOfMeasuredRows + totalSizeOfUnmeasuredItems;
};

/* Create a stringified cell identifier */
export const cellIndentifier = (
  rowIndex: number,
  columnIndex: number
): string => [rowIndex, columnIndex].toString();

/**
 * @desc Throttle fn
 * @param func function
 * @param limit Delay in milliseconds
 */
export function throttle(func: Function, limit: number): Function {
  let inThrottle: boolean;

  return function (this: any): any {
    const args = arguments;
    const context = this;

    if (!inThrottle) {
      inThrottle = true;
      func.apply(context, args);
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function debounce<T extends Function>(cb: T, wait = 20) {
  let h = 0;
  let callable = (...args: any) => {
    clearTimeout(h);
    h = window.setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
}

export function rafThrottle(callback: Function) {
  var active = false; // a simple flag
  var evt: any; // to keep track of the last event
  var handler = function () {
    // fired only when screen has refreshed
    active = false; // release our flag
    callback(evt);
  };
  return function handleEvent(e: any) {
    // the actual event handler
    evt = e; // save our event at each call
    evt && evt.persist();
    if (!active) {
      // only if we weren't already doing it
      active = true; // raise the flag
      requestAnimationFrame(handler); // wait for next screen refresh
    }
  };
}

export interface AlignmentProps extends Omit<IItemMetaData, "offset"> {
  containerHeight: number;
  containerWidth: number;
  align?: Align;
  scrollOffset: number;
  scrollbarSize: number;
  frozenOffset: number;
}

export const getOffsetForIndexAndAlignment = ({
  itemType,
  containerHeight,
  containerWidth,
  rowHeight,
  columnWidth,
  columnCount,
  rowCount,
  index,
  align = Align.smart,
  scrollOffset,
  instanceProps,
  scrollbarSize,
  frozenOffset = 0,
}: AlignmentProps): number => {
  const size = itemType === "column" ? containerWidth : containerHeight;
  const itemMetadata = getItemMetadata({
    itemType,
    rowHeight,
    columnWidth,
    index,
    instanceProps,
  });

  // Get estimated total size after ItemMetadata is computed,
  // To ensure it reflects actual measurements instead of just estimates.
  const estimatedTotalSize =
    itemType === "column"
      ? getEstimatedTotalWidth(columnCount, instanceProps)
      : getEstimatedTotalHeight(rowCount, instanceProps);

  const maxOffset = Math.max(
    0,
    Math.min(estimatedTotalSize - size, itemMetadata.offset - frozenOffset)
  );
  const minOffset = Math.max(
    0,
    itemMetadata.offset - size + scrollbarSize + itemMetadata.size
  );

  if (align === Align.smart) {
    if (scrollOffset >= minOffset - size && scrollOffset <= maxOffset + size) {
      align = Align.auto;
    } else {
      align = Align.center;
    }
  }

  switch (align) {
    case Align.start:
      return maxOffset;
    case Align.end:
      return minOffset;
    case Align.center:
      return Math.round(minOffset + (maxOffset - minOffset) / 2);
    case Align.auto:
    default:
      if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
        return scrollOffset;
      } else if (minOffset > maxOffset) {
        // Because we only take into account the scrollbar size when calculating minOffset
        // this value can be larger than maxOffset when at the end of the list
        return minOffset;
      } else if (scrollOffset < minOffset) {
        return minOffset;
      } else {
        return maxOffset;
      }
  }
};

export const getOffsetForColumnAndAlignment = (
  props: Omit<AlignmentProps, "itemType">
) => {
  return getOffsetForIndexAndAlignment({
    itemType: ItemType.column,
    ...props,
  });
};

export const getOffsetForRowAndAlignment = (
  props: Omit<AlignmentProps, "itemType">
) => {
  return getOffsetForIndexAndAlignment({
    itemType: ItemType.row,
    ...props,
  });
};

// Animation frame based implementation of setTimeout.
// Inspired by Joe Lambert, https://gist.github.com/joelambert/1002116#file-requesttimeout-js

const hasNativePerformanceNow =
  typeof performance === "object" && typeof performance.now === "function";

const now = hasNativePerformanceNow
  ? () => performance.now()
  : () => Date.now();

export type TimeoutID = {
  id: number;
};

export function cancelTimeout(timeoutID: TimeoutID) {
  cancelAnimationFrame(timeoutID.id);
}

/**
 * Create a throttler based on RAF
 * @param callback
 * @param delay
 */
export function requestTimeout(callback: Function, delay: number): TimeoutID {
  const start = now();

  function tick() {
    if (now() - start >= delay) {
      callback.call(null);
    } else {
      timeoutID.id = requestAnimationFrame(tick);
    }
  }

  const timeoutID: TimeoutID = {
    id: requestAnimationFrame(tick),
  };

  return timeoutID;
}

export const selectionFromActiveCell = (
  activeCell: CellInterface | null
): SelectionArea[] => {
  if (!activeCell) return [];
  return [
    {
      bounds: {
        top: activeCell.rowIndex,
        left: activeCell.columnIndex,
        bottom: activeCell.rowIndex,
        right: activeCell.columnIndex,
      },
    },
  ];
};

/**
 * Converts a number to alphabet
 * @param i
 */
export const numberToAlphabet = (i: number): string => {
  return (
    (i >= 26 ? numberToAlphabet(((i / 26) >> 0) - 1) : "") +
    "abcdefghijklmnopqrstuvwxyz"[i % 26 >> 0]
  ).toUpperCase();
};

/**
 * Convert selections to html and csv data
 * @param rows
 */
export const prepareClipboardData = (rows: string[][]): [string, string] => {
  const html = ["<table>"];
  const csv: string[] = [];
  rows.forEach((row) => {
    html.push("<tr>");
    const csvRow: string[] = [];
    row.forEach((cell) => {
      html.push(`<td>${cell}</td>`);
      csvRow.push(`"${cell.replace(/"/g, '""')}"`);
    });
    csv.push(csvRow.join(","));
    html.push("</tr>");
  });
  html.push("</table>");
  return [html.join(""), csv.join("\n")];
};

/**
 * Cycles active cell within selecton bounds
 * @param activeCellBounds
 * @param selectionBounds
 * @param direction
 */
export const findNextCellWithinBounds = (
  activeCellBounds: AreaProps,
  selectionBounds: AreaProps,
  direction: Direction = Direction.Right
): CellInterface | null => {
  let rowIndex, columnIndex;
  let nextActiveCell: CellInterface | null = null;
  if (direction === Direction.Right) {
    rowIndex = activeCellBounds.top;
    columnIndex = activeCellBounds.left + 1;
    if (columnIndex > selectionBounds.right) {
      rowIndex = rowIndex + 1;
      columnIndex = selectionBounds.left;
      if (rowIndex > selectionBounds.bottom) {
        rowIndex = selectionBounds.top;
      }
    }
    nextActiveCell = { rowIndex, columnIndex };
  }
  if (direction === Direction.Left) {
    rowIndex = activeCellBounds.bottom;
    columnIndex = activeCellBounds.left - 1;
    if (columnIndex < selectionBounds.left) {
      rowIndex = rowIndex - 1;
      columnIndex = selectionBounds.right;
      if (rowIndex < selectionBounds.top) {
        rowIndex = selectionBounds.bottom;
      }
    }
    nextActiveCell = { rowIndex, columnIndex };
  }

  if (direction === Direction.Down) {
    rowIndex = activeCellBounds.bottom + 1;
    columnIndex = activeCellBounds.left;
    if (rowIndex > selectionBounds.bottom) {
      columnIndex = activeCellBounds.left + 1;
      rowIndex = selectionBounds.top;
      if (columnIndex > selectionBounds.right) {
        columnIndex = selectionBounds.left;
      }
    }
    nextActiveCell = { rowIndex, columnIndex };
  }

  if (direction === Direction.Up) {
    rowIndex = activeCellBounds.top - 1;
    columnIndex = activeCellBounds.left;
    if (rowIndex < selectionBounds.top) {
      columnIndex = activeCellBounds.left - 1;
      rowIndex = selectionBounds.bottom;
      if (columnIndex < selectionBounds.left) {
        columnIndex = selectionBounds.right;
      }
    }
    nextActiveCell = { rowIndex, columnIndex };
  }

  return nextActiveCell;
};

/**
 * Get maximum bound of an area, caters to merged cells
 * @param area
 * @param boundGetter
 */
export const mergedCellBounds = (
  area: AreaProps,
  boundGetter: (coords: CellInterface) => AreaProps
): AreaProps => {
  for (let i = area.top; i <= area.bottom; i++) {
    for (let j = area.left; j <= area.right; j++) {
      const bounds = boundGetter({ rowIndex: i, columnIndex: j });
      if (bounds.bottom > area.bottom) area.bottom = bounds.bottom;
      if (bounds.right > area.right) area.right = bounds.right;
      if (bounds.left < area.left) area.left = bounds.left;
      if (bounds.top < area.top) area.top = bounds.top;
    }
  }
  return area;
};

/**
 * Simple Canvas element to measure text size
 * @param defaultFont
 *
 * Usage
 *
 * ```
 * const textSizer = new AutoSizer('12px Arial')
 * textSizer.measureText('Hello world').width
 * ```
 */
export const AutoSizerCanvas = (defaultFont: string) => {
  const canvas = <HTMLCanvasElement>document.createElement("canvas");
  const context = canvas.getContext("2d");
  const setFont = (font: string = defaultFont) => {
    if (context) context.font = font;
  };
  const measureText = (text: string) => context?.measureText(text);
  /* Set font in constructor */
  setFont(defaultFont);

  return {
    context,
    measureText,
    setFont,
  };
};

/* Check if a value is null */
export const isNull = (value: any) =>
  value === void 0 || value === null || value === "";

export const isEqualCells = (
  a: CellInterface | null,
  b: CellInterface | null
) => {
  if (a === null || b === null) return false;
  return a.rowIndex === b.rowIndex && a.columnIndex === b.columnIndex;
};
