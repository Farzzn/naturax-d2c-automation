import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sliders,
  History,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Sparkles,
  FileText,
  ArrowUpRight,
  Phone,
  IndianRupee,
  Play,
  Info,
  XCircle,
  Check,
  ChevronRight,
  Users,
  Database,
  Award,
  Zap
} from 'lucide-react';

// ============================================================================
// CONSTANTS & REFERENCE DATA
// ============================================================================
// Fixed reference time for deterministic SLA and rule evaluation: Oct 20, 2026, 18:00
const DEFAULT_NOW_ISO = '2026-10-20T18:00:00';

const EMPLOYEES = [
  'Rahul Nair',
  'Sneha Menon',
  'Arun Kumar',
  'Priya Varma',
  'Kiran Das'
];

const MANAGERS = [
  'Operations Manager (Candidate)',
  'Sripriya Murugasen (HR/Admin)',
  'Ashwini (Team Lead)',
  'System Auto-Engine'
];

const DEFAULT_RULES = {
  unconfirmedHours: 2,
  dispatchDelayHours: 24,
  highValueThreshold: 5000,
  slaHoursHigh: 4,
  slaHoursMedium: 12,
  slaHoursLow: 24
};

const EXCEPTION_CATEGORIES = {
  UNCONFIRMED: 'Unconfirmed Order',
  DISPATCH_DELAY: 'Dispatch Delay',
  SHIPMENT_DELAY: 'Shipment Delay',
  FAILED_DELIVERY: 'Failed Delivery',
  HIGH_VALUE: 'High-Value Order Escalation',
  DATA_ERROR: 'Data Correction Needed'
};

// ============================================================================
// DETERMINISTIC 105-ROW SAMPLE DATASET GENERATOR (NATURAX AYURVEDIC D2C)
// ============================================================================
function generate105SampleOrders() {
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
    'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Sadhana', 'Meera', 'Kavya', 'Nithya',
    'Lakshmi', 'Rohan', 'Vikram', 'Karthik', 'Divya', 'Pooja', 'Neha', 'Suresh',
    'Ramesh', 'Gautam', 'Harish', 'Deepika', 'Swathi', 'Anjali', 'Manoj', 'navin'
  ];
  const lastNames = [
    'Menon', 'Nair', 'Pillai', 'Kurup', 'Varma', 'Nambiar', 'Panicker', 'Shenoy',
    'Kamath', 'Prabhu', 'Iyer', 'Sharma', 'Patel', 'Reddy', 'Rao', 'Gowda',
    'Shetty', 'Bhat', 'Hegde', 'Kulkarni', 'Joshi', 'Deshmukh', 'Verma', 'Gupta'
  ];

  const rows = [];

  const pad = (n) => String(n).padStart(2, '0');
  const formatDT = (day, hour, min = 0) => `2026-10-${pad(day)} ${pad(hour)}:${pad(min)}`;

  for (let i = 1; i <= 105; i++) {
    const custName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const phone = `+91 98${String(40000000 + i * 1379).slice(0, 8)}`;
    const emp = EMPLOYEES[i % EMPLOYEES.length];
    const paymentType = i % 3 === 0 ? 'COD' : 'Prepaid';
    let orderId = `NX-${10000 + i}`;
    let orderValue = 699 + ((i * 250) % 3800);
    let orderDate = formatDT(16, 10, (i * 7) % 60);
    let orderStatus = 'Delivered';
    let dispatchDate = formatDT(16, 18, 30);
    let expectedDeliveryDate = formatDT(19, 20, 0);
    let assignedEmployee = emp;
    let customerName = custName;
    let phoneNumber = phone;

    // 1-45: Normal Healthy Orders (Delivered on time, Confirmed recently, or Dispatched with future ETA)
    if (i <= 30) {
      orderStatus = 'Delivered';
      orderDate = formatDT(14 + (i % 3), 9 + (i % 8), 15);
      dispatchDate = formatDT(15 + (i % 3), 14, 0);
      expectedDeliveryDate = formatDT(19 + (i % 2), 18, 0);
    } else if (i <= 38) {
      // Confirmed recently (within last 6 hours of Oct 20 18:00 -> e.g. Oct 20 13:00 to 17:00)
      orderStatus = 'Confirmed';
      orderDate = formatDT(20, 12 + (i % 5), 30);
      dispatchDate = '';
      expectedDeliveryDate = formatDT(24, 18, 0);
    } else if (i <= 45) {
      // Dispatched on track (Expected delivery Oct 21-23)
      orderStatus = 'Dispatched';
      orderDate = formatDT(19, 10, 0);
      dispatchDate = formatDT(19, 19, 0);
      expectedDeliveryDate = formatDT(22, 18, 0);
    }

    // 46-57: RULE 1 - Unconfirmed Orders (> 2 hours old from Oct 20 18:00)
    else if (i <= 57) {
      orderStatus = 'Unconfirmed';
      // Some 3-8 hours old, some 15 hours old
      const hoursAgo = 3 + (i - 46) * 2;
      const dt = new Date(new Date(DEFAULT_NOW_ISO).getTime() - hoursAgo * 3600 * 1000);
      orderDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      dispatchDate = '';
      expectedDeliveryDate = formatDT(24, 18, 0);
      paymentType === 'COD';
    }

    // 58-71: RULE 2 - Dispatch Delays (Confirmed, not dispatched within 24h, plus some between 13h-22h for live interview 12h slider test!)
    else if (i <= 71) {
      orderStatus = 'Confirmed';
      dispatchDate = '';
      expectedDeliveryDate = formatDT(23, 18, 0);
      if (i <= 66) {
        // 28 to 55 hours old (triggers default 24h rule)
        const hoursAgo = 28 + (i - 58) * 3;
        const dt = new Date(new Date(DEFAULT_NOW_ISO).getTime() - hoursAgo * 3600 * 1000);
        orderDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:15`;
      } else {
        // 14 to 20 hours old (Normal at 24h rule, but triggers immediately when interviewer changes threshold to 12h!)
        const hoursAgo = 14 + (i - 67) * 1.5;
        const dt = new Date(new Date(DEFAULT_NOW_ISO).getTime() - hoursAgo * 3600 * 1000);
        orderDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:45`;
      }
    }

    // 72-82: RULE 3 - Shipment Delays (Dispatched, Expected Delivery Date < Oct 20 18:00, orderValue <= 5000)
    else if (i <= 82) {
      orderStatus = 'Dispatched';
      orderValue = 1250 + ((i - 72) * 310); // kept under 5000
      orderDate = formatDT(13, 11, 0);
      dispatchDate = formatDT(14, 15, 0);
      expectedDeliveryDate = formatDT(17 + (i % 3), 18, 0); // Oct 17, 18, 19 (past due!)
    }

    // 83-90: RULE 4 - Failed Delivery (NDR)
    else if (i <= 90) {
      orderStatus = 'Failed Delivery';
      orderValue = 1499 + ((i - 83) * 400);
      orderDate = formatDT(14, 10, 30);
      dispatchDate = formatDT(15, 13, 0);
      expectedDeliveryDate = formatDT(18, 18, 0);
    }

    // 91-97: RULE 5 - High-Value Orders (> ₹5,000 and past expected delivery date, undelivered)
    else if (i <= 97) {
      orderStatus = i % 2 === 0 ? 'Dispatched' : 'Confirmed';
      orderValue = 5499 + (i - 91) * 1250; // ₹5,499 to ₹12,999
      orderDate = formatDT(12, 9, 30);
      dispatchDate = orderStatus === 'Dispatched' ? formatDT(13, 16, 0) : '';
      expectedDeliveryDate = formatDT(17 + (i % 2), 18, 0); // Past expected delivery date!
    }

    // 98-105: RULE 6 - Malformed / Data Validation Issues (Missing fields, Duplicate IDs, Invalid Dates)
    else if (i === 98) {
      // Duplicate Order ID of NX-10005
      orderId = 'NX-10005';
      orderStatus = 'Confirmed';
      orderDate = formatDT(19, 14, 0);
      dispatchDate = '';
    } else if (i === 99) {
      // Duplicate Order ID of NX-10048
      orderId = 'NX-10048';
      orderStatus = 'Dispatched';
    } else if (i === 100) {
      // Missing Customer Name
      customerName = '';
      orderStatus = 'Confirmed';
      dispatchDate = '';
    } else if (i === 101) {
      // Missing Phone Number
      phoneNumber = '';
      orderStatus = 'Unconfirmed';
      dispatchDate = '';
    } else if (i === 102) {
      // Invalid Order Date string
      orderDate = '2026-13-45 99:00';
      orderStatus = 'Confirmed';
      dispatchDate = '';
    } else if (i === 103) {
      // Missing Expected Delivery Date on Dispatched Order
      orderStatus = 'Dispatched';
      expectedDeliveryDate = '';
    } else if (i === 104) {
      // Invalid Order Value (Negative or Non-numeric)
      orderValue = 'INVALID_AMT';
      orderStatus = 'Confirmed';
      dispatchDate = '';
    } else if (i === 105) {
      // Missing Order Date
      orderDate = '';
      orderStatus = 'Unconfirmed';
      dispatchDate = '';
    }

    rows.push({
      orderId,
      orderDate,
      customerName,
      phoneNumber,
      orderValue,
      paymentType,
      orderStatus,
      dispatchDate,
      expectedDeliveryDate,
      assignedEmployee
    });
  }

  return rows;
}

// ============================================================================
// CSV PARSER & SERIALIZER UTILITIES
// ============================================================================
const CSV_HEADERS = [
  'Order ID',
  'Order date',
  'Customer name',
  'Phone number',
  'Order value',
  'Payment type',
  'Order status',
  'Dispatch date',
  'Expected delivery date',
  'Assigned employee'
];

function ordersToCSV(orders) {
  const escape = (val) => {
    const str = val === undefined || val === null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = CSV_HEADERS.join(',');
  const lines = orders.map((o) =>
    [
      o.orderId,
      o.orderDate,
      o.customerName,
      o.phoneNumber,
      o.orderValue,
      o.paymentType,
      o.orderStatus,
      o.dispatchDate,
      o.expectedDeliveryDate,
      o.assignedEmployee
    ]
      .map(escape)
      .join(',')
  );
  return [headerLine, ...lines].join('\n');
}

function parseCSVToOrders(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const splitCSVLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idxMap = {
    orderId: headers.findIndex((h) => h.includes('order id') || h === 'orderid' || h === 'id'),
    orderDate: headers.findIndex((h) => h.includes('order date') || h === 'orderdate'),
    customerName: headers.findIndex((h) => h.includes('customer') || h === 'name'),
    phoneNumber: headers.findIndex((h) => h.includes('phone') || h.includes('mobile')),
    orderValue: headers.findIndex((h) => h.includes('value') || h.includes('amount')),
    paymentType: headers.findIndex((h) => h.includes('payment')),
    orderStatus: headers.findIndex((h) => h.includes('status')),
    dispatchDate: headers.findIndex((h) => h.includes('dispatch')),
    expectedDeliveryDate: headers.findIndex((h) => h.includes('expected') || h.includes('delivery date')),
    assignedEmployee: headers.findIndex((h) => h.includes('employee') || h.includes('assigned'))
  };

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const getCol = (key, fallbackIdx) => {
      const idx = idxMap[key] !== -1 ? idxMap[key] : fallbackIdx;
      return cols[idx] !== undefined ? cols[idx].trim() : '';
    };
    parsed.push({
      rowNumber: i + 1,
      orderId: getCol('orderId', 0),
      orderDate: getCol('orderDate', 1),
      customerName: getCol('customerName', 2),
      phoneNumber: getCol('phoneNumber', 3),
      orderValue: getCol('orderValue', 4),
      paymentType: getCol('paymentType', 5),
      orderStatus: getCol('orderStatus', 6),
      dispatchDate: getCol('dispatchDate', 7),
      expectedDeliveryDate: getCol('expectedDeliveryDate', 8),
      assignedEmployee: getCol('assignedEmployee', 9)
    });
  }
  return parsed;
}

// Helper to parse dates safely
function parseValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const normalized = dateStr.trim().replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d;
}

// ============================================================================
// CORE RULE & VALIDATION ENGINE
// ============================================================================
function evaluateOrdersWithRules(orders, rules, existingTasks = [], referenceTimeISO = DEFAULT_NOW_ISO) {
  const refNow = new Date(referenceTimeISO);
  const existingTaskMap = new Map();
  existingTasks.forEach((t) => {
    existingTaskMap.set(t.taskKey, t);
  });

  // Track Order ID counts for duplicate detection
  const idCounts = {};
  const seenOrderIds = new Set();

  orders.forEach((o) => {
    const id = (o.orderId || '').trim();
    if (id) {
      idCounts[id] = (idCounts[id] || 0) + 1;
    }
  });

  const evaluatedOrders = [];
  const nextTasks = [];
  let newExceptionsCount = 0;
  let duplicateSkippedCount = 0;

  orders.forEach((order, index) => {
    const rawId = (order.orderId || '').trim();
    const rowId = rawId || `MISSING-ID-ROW-${index + 2}`;
    const isSecondOccurrenceOfDuplicate = rawId && seenOrderIds.has(rawId);
    if (rawId) seenOrderIds.add(rawId);

    // 1. Validate Mandatory Fields & Formats
    const validationErrors = [];
    if (!rawId) validationErrors.push('Missing Order ID');
    if (isSecondOccurrenceOfDuplicate) {
      validationErrors.push(`Duplicate Order ID (${rawId}) detected in batch`);
    }
    if (!order.customerName || order.customerName.trim() === '') {
      validationErrors.push('Missing Customer Name');
    }
    if (!order.phoneNumber || order.phoneNumber.trim() === '') {
      validationErrors.push('Missing Phone Number');
    }

    const numericValue = Number(order.orderValue);
    if (order.orderValue === '' || order.orderValue === null || isNaN(numericValue) || numericValue <= 0) {
      validationErrors.push(`Invalid Order Value ("${order.orderValue}")`);
    }

    const parsedOrderDate = parseValidDate(order.orderDate);
    if (!parsedOrderDate) {
      validationErrors.push(`Missing or invalid Order Date ("${order.orderDate || 'Empty'}")`);
    }

    const statusNorm = (order.orderStatus || '').trim();
    if (!statusNorm) {
      validationErrors.push('Missing Order Status');
    }

    const parsedDispatchDate = order.dispatchDate ? parseValidDate(order.dispatchDate) : null;
    if (order.dispatchDate && !parsedDispatchDate) {
      validationErrors.push(`Invalid Dispatch Date ("${order.dispatchDate}")`);
    }

    const parsedExpectedDate = order.expectedDeliveryDate ? parseValidDate(order.expectedDeliveryDate) : null;
    if (
      (statusNorm === 'Dispatched' || statusNorm === 'Failed Delivery') &&
      !parsedExpectedDate
    ) {
      validationErrors.push(`Missing/invalid Expected Delivery Date for ${statusNorm} order`);
    }

    const orderExceptions = [];

    // RULE 6: Data Validation Error (Do NOT run business rules on broken data)
    if (validationErrors.length > 0) {
      orderExceptions.push({
        category: EXCEPTION_CATEGORIES.DATA_ERROR,
        priority: 'High',
        reason: validationErrors.join('; '),
        recommendedAction: 'Fix missing/corrupt order record in source sheet & re-sync',
        slaHours: rules.slaHoursHigh
      });
    } else {
      // Standard 5 Business Rules on Valid Records
      const hoursSinceOrder = (refNow.getTime() - parsedOrderDate.getTime()) / (1000 * 3600);
      const isPastExpected = parsedExpectedDate ? refNow.getTime() > parsedExpectedDate.getTime() : false;
      const hoursPastExpected = parsedExpectedDate
        ? Math.round((refNow.getTime() - parsedExpectedDate.getTime()) / (1000 * 3600))
        : 0;

      // RULE 1: Unconfirmed Orders (> X hours)
      if (statusNorm === 'Unconfirmed' && hoursSinceOrder > rules.unconfirmedHours) {
        orderExceptions.push({
          category: EXCEPTION_CATEGORIES.UNCONFIRMED,
          priority: 'Medium',
          reason: `Order unconfirmed for ${Math.round(hoursSinceOrder)} hrs (Threshold: ${rules.unconfirmedHours}h)`,
          recommendedAction: 'Call customer to verify order intent & shipping address',
          slaHours: rules.slaHoursMedium
        });
      }

      // RULE 2: Dispatch Delays (Confirmed & not dispatched within Y hours)
      if (statusNorm === 'Confirmed' && !parsedDispatchDate && hoursSinceOrder > rules.dispatchDelayHours) {
        orderExceptions.push({
          category: EXCEPTION_CATEGORIES.DISPATCH_DELAY,
          priority: 'Medium',
          reason: `Confirmed ${Math.round(hoursSinceOrder)} hrs ago without dispatch (Threshold: ${rules.dispatchDelayHours}h)`,
          recommendedAction: 'Follow up with warehouse team for immediate packing & dispatch',
          slaHours: rules.slaHoursMedium
        });
      }

      // RULE 3: Shipment Delays (Dispatched & Expected delivery date passed)
      if (statusNorm === 'Dispatched' && isPastExpected) {
        orderExceptions.push({
          category: EXCEPTION_CATEGORIES.SHIPMENT_DELAY,
          priority: 'High',
          reason: `Dispatched shipment overdue by ${hoursPastExpected} hrs past expected delivery (${order.expectedDeliveryDate})`,
          recommendedAction: 'Escalate with courier partner for immediate delivery ETA',
          slaHours: rules.slaHoursHigh
        });
      }

      // RULE 4: Failed Delivery (NDR)
      if (statusNorm === 'Failed Delivery') {
        orderExceptions.push({
          category: EXCEPTION_CATEGORIES.FAILED_DELIVERY,
          priority: 'High',
          reason: 'Courier reported Failed Delivery attempt (NDR triggered)',
          recommendedAction: 'Immediate NDR call with customer to confirm availability & re-attempt delivery',
          slaHours: rules.slaHoursHigh
        });
      }

      // RULE 5: High-Value Orders (> ₹5000, undelivered beyond expected delivery date)
      if (
        numericValue > rules.highValueThreshold &&
        statusNorm !== 'Delivered' &&
        isPastExpected
      ) {
        orderExceptions.push({
          category: EXCEPTION_CATEGORIES.HIGH_VALUE,
          priority: 'High',
          reason: `VIP Order worth ₹${numericValue.toLocaleString('en-IN')} undelivered ${hoursPastExpected} hrs past expected date`,
          recommendedAction: 'Priority VIP Escalation: Direct call to customer & dedicated courier manager',
          slaHours: 2 // Ultra-urgent 2h SLA
        });
      }
    }

    // Build or merge tasks (Deduplication logic by unique taskKey)
    orderExceptions.forEach((exc, excIdx) => {
      const uniqueRowKey = isSecondOccurrenceOfDuplicate ? `${rowId}-DUP-${index}` : rowId;
      const taskKey = `${uniqueRowKey}::${exc.category}`;
      const existing = existingTaskMap.get(taskKey);

      if (existing) {
        duplicateSkippedCount++;
        // Preserve existing status, assignee, and SLA while updating dynamic reason text
        nextTasks.push({
          ...existing,
          reason: exc.reason,
          orderValue: order.orderValue,
          orderStatus: order.orderStatus,
          customerName: order.customerName || 'Unknown Customer',
          phoneNumber: order.phoneNumber || 'N/A'
        });
      } else {
        newExceptionsCount++;
        // Determine SLA deadline: to make the demo realistic, some older orders start overdue so managers can test overdue filtering & reassignment
        const orderAgeHours = parsedOrderDate
          ? (refNow.getTime() - parsedOrderDate.getTime()) / (1000 * 3600)
          : 48;
        const createdOffsetHours = Math.min(Math.max(orderAgeHours - 2, 1), 16);
        const createdAtDate = new Date(refNow.getTime() - createdOffsetHours * 3600 * 1000);
        const slaDeadlineDate = new Date(createdAtDate.getTime() + exc.slaHours * 3600 * 1000);

        nextTasks.push({
          taskKey,
          id: `TSK-${1000 + nextTasks.length + 1}`,
          orderId: rawId || 'MISSING_ID',
          orderDate: order.orderDate || 'N/A',
          customerName: order.customerName || 'Missing Name',
          phoneNumber: order.phoneNumber || 'Missing Phone',
          orderValue: numericValue > 0 ? numericValue : order.orderValue || 0,
          paymentType: order.paymentType || 'N/A',
          orderStatus: order.orderStatus || 'Missing Status',
          dispatchDate: order.dispatchDate || '',
          expectedDeliveryDate: order.expectedDeliveryDate || '',
          category: exc.category,
          priority: exc.priority,
          reason: exc.reason,
          recommendedAction: exc.recommendedAction,
          assignedEmployee: order.assignedEmployee && EMPLOYEES.includes(order.assignedEmployee)
            ? order.assignedEmployee
            : EMPLOYEES[index % EMPLOYEES.length],
          status: 'Open',
          createdAt: createdAtDate.toISOString(),
          slaDeadline: slaDeadlineDate.toISOString(),
          isNewInLatestRun: true,
          updatedAt: refNow.toISOString()
        });
      }
    });

    evaluatedOrders.push({
      ...order,
      isValid: validationErrors.length === 0,
      validationErrors,
      exceptionCount: orderExceptions.length,
      exceptions: orderExceptions.map((e) => e.category)
    });
  });

  return {
    evaluatedOrders,
    tasks: nextTasks,
    newExceptionsCount,
    duplicateSkippedCount
  };
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Active User / Manager for Audit Trail
  const [activeManager, setActiveManager] = useState(MANAGERS[0]);

  // Rule Engine Thresholds
  const [rules, setRules] = useState(() => {
    try {
      const saved = localStorage.getItem('naturax_rules_v1');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  // Raw Orders State (starts empty until user uploads a CSV file)
  const [rawOrders, setRawOrders] = useState([]);

  // Tasks State (starts empty until user uploads a CSV file)
  const [tasks, setTasks] = useState([]);

  // Audit Log State (starts empty until user uploads a CSV file)
  const [auditLogs, setAuditLogs] = useState([]);

  // Notification Banner State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Rule Configuration Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [draftRules, setDraftRules] = useState(rules);

  // Filters for Tasks / Exceptions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterEmployee, setFilterEmployee] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fileInputRef = useRef(null);

  // Save rules to localStorage and clear any stale pre-loaded order cache
  useEffect(() => {
    try {
      localStorage.setItem('naturax_rules_v1', JSON.stringify(rules));
      localStorage.removeItem('naturax_orders_v1');
      localStorage.removeItem('naturax_tasks_v1');
      localStorage.removeItem('naturax_audit_v1');
    } catch (e) {
      console.error('LocalStorage update failed:', e);
    }
  }, [rules]);

  // Add Audit Entry helper
  const addAuditLog = (orderId, actionType, details, previousValue, newValue, userOverride) => {
    const entry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp: new Date().toLocaleString('en-IN'),
      orderId,
      actionType,
      details,
      previousValue: String(previousValue),
      newValue: String(newValue),
      user: userOverride || activeManager
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // ============================================================================
  // COMPUTED METRICS & EVALUATED ORDERS
  // ============================================================================
  const refNowMs = new Date(DEFAULT_NOW_ISO).getTime();

  const evaluatedSummary = useMemo(() => {
    return evaluateOrdersWithRules(rawOrders, rules, tasks);
  }, [rawOrders, rules]);

  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => {
      const deadlineMs = new Date(t.slaDeadline).getTime();
      const isOverdue = t.status !== 'Resolved' && refNowMs > deadlineMs;
      const hoursRemaining = Math.round((deadlineMs - refNowMs) / (1000 * 3600));
      return {
        ...t,
        isOverdue,
        hoursRemaining
      };
    });
  }, [tasks, refNowMs]);

  const metrics = useMemo(() => {
    const totalOrders = rawOrders.length;
    const uniqueOrdersWithExceptions = new Set(enrichedTasks.map((t) => t.orderId)).size;
    const openTasks = enrichedTasks.filter((t) => t.status === 'Open').length;
    const inProgressTasks = enrichedTasks.filter((t) => t.status === 'In Progress').length;
    const resolvedTasks = enrichedTasks.filter((t) => t.status === 'Resolved').length;
    const overdueTasks = enrichedTasks.filter((t) => t.isOverdue).length;
    const highPriorityTasks = enrichedTasks.filter(
      (t) => t.priority === 'High' && t.status !== 'Resolved'
    ).length;
    const dataErrors = enrichedTasks.filter(
      (t) => t.category === EXCEPTION_CATEGORIES.DATA_ERROR && t.status !== 'Resolved'
    ).length;

    const byCategory = {};
    Object.values(EXCEPTION_CATEGORIES).forEach((cat) => {
      byCategory[cat] = enrichedTasks.filter((t) => t.category === cat).length;
    });

    const byEmployee = {};
    EMPLOYEES.forEach((emp) => {
      const empTasks = enrichedTasks.filter((t) => t.assignedEmployee === emp);
      byEmployee[emp] = {
        total: empTasks.length,
        open: empTasks.filter((t) => t.status === 'Open').length,
        inProgress: empTasks.filter((t) => t.status === 'In Progress').length,
        resolved: empTasks.filter((t) => t.status === 'Resolved').length,
        overdue: empTasks.filter((t) => t.isOverdue).length,
        highPriority: empTasks.filter((t) => t.priority === 'High' && t.status !== 'Resolved').length
      };
    });

    return {
      totalOrders,
      uniqueOrdersWithExceptions,
      openTasks,
      inProgressTasks,
      resolvedTasks,
      overdueTasks,
      highPriorityTasks,
      dataErrors,
      byCategory,
      byEmployee
    };
  }, [rawOrders, enrichedTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((t) => {
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
      if (filterEmployee !== 'ALL' && t.assignedEmployee !== filterEmployee) return false;
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterOverdueOnly && !t.isOverdue) return false;

      if (filterDateFrom) {
        const orderD = (t.orderDate || '').slice(0, 10);
        if (orderD < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const orderD = (t.orderDate || '').slice(0, 10);
        if (orderD > filterDateTo) return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchOrder = (t.orderId || '').toLowerCase().includes(q);
        const matchName = (t.customerName || '').toLowerCase().includes(q);
        const matchReason = (t.reason || '').toLowerCase().includes(q);
        const matchPhone = (t.phoneNumber || '').toLowerCase().includes(q);
        if (!matchOrder && !matchName && !matchReason && !matchPhone) return false;
      }
      return true;
    });
  }, [
    enrichedTasks,
    filterCategory,
    filterEmployee,
    filterPriority,
    filterStatus,
    filterOverdueOnly,
    filterDateFrom,
    filterDateTo,
    searchQuery
  ]);

  // ============================================================================
  // INTERACTIVE HANDLERS (TASK REASSIGNMENT, STATUS, RULES, CSV IMPORT/EXPORT)
  // ============================================================================
  const handleStatusChange = (taskKey, newStatus) => {
    const target = tasks.find((t) => t.taskKey === taskKey);
    if (!target || target.status === newStatus) return;

    const oldStatus = target.status;
    setTasks((prev) =>
      prev.map((t) =>
        t.taskKey === taskKey
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      )
    );

    addAuditLog(
      target.orderId,
      'Task Status Updated',
      `Status changed for "${target.category}" (${target.id})`,
      oldStatus,
      newStatus
    );
    showToast(`Order ${target.orderId} marked as ${newStatus}`);
  };

  const handleEmployeeReassign = (taskKey, newEmployee) => {
    const target = enrichedTasks.find((t) => t.taskKey === taskKey);
    if (!target || target.assignedEmployee === newEmployee) return;

    const oldEmployee = target.assignedEmployee;
    const wasOverdue = target.isOverdue;

    // If task was overdue and reassigned, automatically log escalation & extend SLA window by 4 hours from reference time
    const updatedSla = wasOverdue
      ? new Date(refNowMs + 4 * 3600 * 1000).toISOString()
      : target.slaDeadline;

    setTasks((prev) =>
      prev.map((t) =>
        t.taskKey === taskKey
          ? {
              ...t,
              assignedEmployee: newEmployee,
              status: t.status === 'Open' ? 'In Progress' : t.status,
              slaDeadline: updatedSla,
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );

    addAuditLog(
      target.orderId,
      wasOverdue ? 'Overdue Task Reassigned & Escalated' : 'Task Reassigned',
      `Reassigned ${target.category} (${target.id})${wasOverdue ? ' with +4h SLA recovery window & status -> In Progress' : ''}`,
      oldEmployee,
      newEmployee
    );
    showToast(
      `Reassigned ${target.orderId} from ${oldEmployee} to ${newEmployee}${
        wasOverdue ? ' (Overdue SLA extended +4h)' : ''
      }`
    );
  };

  const handleApplyRules = (newRulesObj, customNote = '') => {
    const prevRules = { ...rules };
    setRules(newRulesObj);
    setDraftRules(newRulesObj);
    const result = evaluateOrdersWithRules(rawOrders, newRulesObj, tasks);
    setTasks(result.tasks);
    setShowRuleModal(false);

    addAuditLog(
      'RULE-ENGINE',
      'Rule Thresholds Updated',
      customNote ||
        `Unconfirmed: ${newRulesObj.unconfirmedHours}h, Dispatch Delay: ${newRulesObj.dispatchDelayHours}h, High-Value: ₹${newRulesObj.highValueThreshold}`,
      `Dispatch:${prevRules.dispatchDelayHours}h / Unconf:${prevRules.unconfirmedHours}h`,
      `Dispatch:${newRulesObj.dispatchDelayHours}h / Unconf:${newRulesObj.unconfirmedHours}h (${result.newExceptionsCount} new tasks)`
    );

    showToast(
      `Rules updated! Re-evaluated ${rawOrders.length} orders (${result.newExceptionsCount} new exceptions triggered).`
    );
  };

  // CSV Upload Handler with Deduplication
  const handleCSVFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        processUploadedCSVText(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processUploadedCSVText = (csvText, sourceLabel = 'Uploaded CSV') => {
    const uploadedRows = parseCSVToOrders(csvText);
    if (uploadedRows.length === 0) {
      showToast('Could not parse any valid rows from CSV file.', 'error');
      return;
    }

    // Deduplication at order merge level:
    // If an order with the exact same Order ID already exists in rawOrders and the user is uploading a batch,
    // we check whether it's a re-upload of existing orders or an intentional duplicate inside the uploaded CSV itself.
    const existingOrderIds = new Set(rawOrders.map((o) => o.orderId));
    let updatedExistingCount = 0;
    let newlyAddedOrdersCount = 0;

    // Replace dataset or merge cleanly:
    // When user uploads a full sheet (>50 rows), treat as full batch sync with task deduplication.
    // When user uploads an incremental sheet (<=50 rows), append/merge while deduplicating tasks!
    let nextOrders;
    if (uploadedRows.length >= 50) {
      nextOrders = uploadedRows;
    } else {
      const orderMap = new Map();
      rawOrders.forEach((o, i) => orderMap.set(`${o.orderId}::${i}`, o));
      // Append uploaded rows so internal file duplicates are caught by Rule 6, while existing tasks are deduplicated by taskKey
      nextOrders = [...rawOrders];
      uploadedRows.forEach((upRow) => {
        const existingIdx = nextOrders.findIndex(
          (o) => o.orderId && o.orderId === upRow.orderId
        );
        if (existingIdx !== -1 && !upRow.forceDuplicateRow) {
          nextOrders[existingIdx] = upRow;
          updatedExistingCount++;
        } else {
          nextOrders.push(upRow);
          newlyAddedOrdersCount++;
        }
      });
    }

    const evalRes = evaluateOrdersWithRules(nextOrders, rules, tasks);
    setRawOrders(nextOrders);
    setTasks(evalRes.tasks);

    addAuditLog(
      sourceLabel,
      'CSV Data Import & Deduplication',
      `Processed ${uploadedRows.length} rows. Generated ${evalRes.newExceptionsCount} new exception tasks; skipped ${evalRes.duplicateSkippedCount} duplicate existing tasks.`,
      `${rawOrders.length} orders`,
      `${nextOrders.length} orders (${evalRes.tasks.length} total tasks)`
    );

    showToast(
      `Imported ${uploadedRows.length} rows from ${sourceLabel}: ${evalRes.newExceptionsCount} new exceptions created, ${evalRes.duplicateSkippedCount} duplicate tasks prevented!`
    );
  };

  // Download Sample 105-Row CSV
  const handleDownloadSampleCSV = () => {
    const datasetToExport = rawOrders.length > 0 ? rawOrders : generate105SampleOrders();
    const csvContent = ordersToCSV(datasetToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NaturaX_D2C_Sample_105_Orders.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded NaturaX_D2C_Sample_105_Orders.csv (${datasetToExport.length} rows)`);
  };

  // Download Daily Exception Report CSV
  const handleDownloadDailyExceptionReport = () => {
    const headers = [
      'Report Section',
      'Task ID',
      'Order ID',
      'Customer Name',
      'Phone Number',
      'Order Value (INR)',
      'Order Status',
      'Exception Category',
      'Priority',
      'Exception Reason',
      'Recommended Action',
      'Assigned Employee',
      'Task Status',
      'SLA Status',
      'SLA Deadline'
    ];

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows = enrichedTasks.map((t) => {
      let section = 'Active Exception';
      if (t.isOverdue) section = 'OVERDUE - Immediate Escalation';
      else if (t.priority === 'High' && t.status !== 'Resolved') section = 'High-Priority Case';
      else if (t.status === 'Resolved') section = 'Resolved Today';

      return [
        section,
        t.id,
        t.orderId,
        t.customerName,
        t.phoneNumber,
        t.orderValue,
        t.orderStatus,
        t.category,
        t.priority,
        t.reason,
        t.recommendedAction,
        t.assignedEmployee,
        t.status,
        t.isOverdue ? 'OVERDUE' : 'Within SLA',
        new Date(t.slaDeadline).toLocaleString('en-IN')
      ]
        .map(escape)
        .join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NaturaX_Daily_Exception_Report_${DEFAULT_NOW_ISO.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addAuditLog(
      'DAILY-REPORT',
      'Daily Exception Report Exported',
      `Exported ${enrichedTasks.length} exception records (${metrics.overdueTasks} overdue, ${metrics.highPriorityTasks} high-priority).`,
      'Report View',
      'CSV Downloaded'
    );
    showToast('Downloaded Daily Exception Report CSV!');
  };

  // Clear Data & Reset Rules
  const handleResetDemo = () => {
    setRules(DEFAULT_RULES);
    setDraftRules(DEFAULT_RULES);
    setRawOrders([]);
    setTasks([]);
    setAuditLogs([]);
    showToast('Cleared all loaded orders and reset rules to defaults. Upload a CSV to begin.');
  };

  // ============================================================================
  // LIVE INTERVIEW CHALLENGE ONE-CLICK SIMULATORS
  // ============================================================================
  const triggerChallenge1_UploadCorruptBatch = () => {
    const corruptCSV = [
      CSV_HEADERS.join(','),
      'NX-10005,2026-10-20 11:00,Duplicate Test User,+91 9899999991,1899,Prepaid,Confirmed,,2026-10-24 18:00,Rahul Nair',
      'NX-20901,,Meenakshi Iyer,+91 9845012345,2499,COD,Unconfirmed,,2026-10-24 18:00,Sneha Menon',
      'NX-20902,2026-10-19 08:30,,+91 9845099999,6499,Prepaid,Dispatched,2026-10-19 14:00,,Arun Kumar',
      'NX-20903,INVALID-DATE-TEXT,Raghavendra Rao,+91 9845088888,1599,Prepaid,Confirmed,,2026-10-23 18:00,Priya Varma'
    ].join('\n');

    processUploadedCSVText(corruptCSV, 'Live-Interview-Challenge-Batch.csv');
    setFilterCategory(EXCEPTION_CATEGORIES.DATA_ERROR);
    setActiveTab('tasks');
  };

  const triggerChallenge3_DispatchRule24to12 = () => {
    const updated = { ...rules, dispatchDelayHours: 12 };
    handleApplyRules(
      updated,
      'Live Interview Challenge #3: Changed Dispatch Delay rule from 24 hours to 12 hours'
    );
    setFilterCategory(EXCEPTION_CATEGORIES.DISPATCH_DELAY);
    setActiveTab('tasks');
  };

  const triggerChallenge4_TestDeduplication = () => {
    if (rawOrders.length === 0) {
      showToast('Please upload a CSV file first before testing re-upload deduplication.', 'error');
      return;
    }
    // Re-upload the current dataset to prove zero duplicate tasks are created
    const csvText = ordersToCSV(rawOrders);
    processUploadedCSVText(csvText, 'Duplicate-Reupload-Test.csv');
  };

  const triggerChallenge5_ReassignOverdueTask = () => {
    const overdueTask = enrichedTasks.find((t) => t.isOverdue && t.status !== 'Resolved');
    if (!overdueTask) {
      showToast('No overdue tasks currently open to reassign.', 'error');
      return;
    }
    const nextEmp =
      EMPLOYEES[(EMPLOYEES.indexOf(overdueTask.assignedEmployee) + 1) % EMPLOYEES.length];
    handleEmployeeReassign(overdueTask.taskKey, nextEmp);
    setActiveTab('audit');
  };

  // ============================================================================
  // UI HELPERS
  // ============================================================================
  const getPriorityBadge = (priority) => {
    if (priority === 'High') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          High
        </span>
      );
    }
    if (priority === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Low
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const styles = {
      [EXCEPTION_CATEGORIES.HIGH_VALUE]: 'bg-purple-100 text-purple-800 border-purple-200',
      [EXCEPTION_CATEGORIES.FAILED_DELIVERY]: 'bg-rose-100 text-rose-800 border-rose-200',
      [EXCEPTION_CATEGORIES.SHIPMENT_DELAY]: 'bg-orange-100 text-orange-800 border-orange-200',
      [EXCEPTION_CATEGORIES.DISPATCH_DELAY]: 'bg-amber-100 text-amber-800 border-amber-200',
      [EXCEPTION_CATEGORIES.UNCONFIRMED]: 'bg-blue-100 text-blue-800 border-blue-200',
      [EXCEPTION_CATEGORIES.DATA_ERROR]: 'bg-red-50 text-red-900 border-red-300 font-semibold'
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
          styles[category] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {category}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-emerald-950 text-white border-b border-emerald-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-inner font-bold text-lg text-emerald-950">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  NaturaX D2C Order Ops & Exception Engine
                </h1>
                <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider font-semibold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-700">
                  VitaNatura Elements Pvt Ltd
                </span>
              </div>
              <p className="text-xs text-emerald-300">
                Automated Post-Order Follow-up, Rule Evaluation & Escalation System
              </p>
            </div>
          </div>

          {/* Right Controls: Active Manager, Rule Settings, CSV Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-emerald-900/80 border border-emerald-700 rounded-lg px-2.5 py-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span className="text-emerald-300 mr-1">Acting As:</span>
              <select
                value={activeManager}
                onChange={(e) => setActiveManager(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {MANAGERS.map((m) => (
                  <option key={m} value={m} className="text-slate-900">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setDraftRules(rules);
                setShowRuleModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              Rule Engine ({rules.dispatchDelayHours}h / ₹{rules.highValueThreshold})
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </button>

            <button
              onClick={handleDownloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 transition"
              title="Download the 105-row sample CSV dataset"
            >
              <Download className="w-3.5 h-3.5" />
              105-Row Sample CSV
            </button>

            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-950 hover:bg-red-900/60 text-emerald-300 hover:text-white border border-emerald-800 transition"
              title="Reset to default 105 orders"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-emerald-900/80 gap-1 pt-1">
          {[
            { id: 'dashboard', label: '1. Operations Dashboard', icon: LayoutDashboard },
            {
              id: 'tasks',
              label: `2. Exception Tasks (${enrichedTasks.filter((t) => t.status !== 'Resolved').length})`,
              icon: AlertTriangle,
              badge: metrics.overdueTasks > 0 ? `${metrics.overdueTasks} Overdue` : null
            },
            {
              id: 'orders',
              label: `3. Uploaded Orders (${rawOrders.length})`,
              icon: Database
            },
            {
              id: 'report',
              label: '4. Daily Exception Report',
              icon: FileSpreadsheet
            },
            {
              id: 'audit',
              label: `5. Audit Trail (${auditLogs.length})`,
              icon: History
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg whitespace-nowrap transition border-b-2 ${
                  isActive
                    ? 'bg-slate-50 text-emerald-950 border-emerald-500 shadow-sm'
                    : tab.highlight
                    ? 'text-amber-300 hover:bg-emerald-900/60 border-transparent'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900/40 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-emerald-900 text-white border-emerald-600'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-red-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ===================================================================
            TAB 1: OPERATIONS DASHBOARD
        =================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {rawOrders.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300 p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  No Order Data Loaded Yet
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Upload a CSV order sheet to populate the dashboard, evaluate the 5-rule SLA &amp; exception engine, and generate agent follow-up queues.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition"
                  >
                    <Upload className="w-4 h-4" />
                    Upload CSV File
                  </button>
                  <button
                    onClick={handleDownloadSampleCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download 105-Row Sample CSV
                  </button>
                </div>
              </div>
            )}

            {/* 5 Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                onClick={() => setActiveTab('orders')}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Orders
                  </span>
                  <Database className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{metrics.totalOrders}</span>
                  <span className="text-xs text-emerald-600 font-medium">
                    {metrics.totalOrders - metrics.uniqueOrdersWithExceptions} Healthy
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {metrics.uniqueOrdersWithExceptions} orders flagged with exceptions
                </p>
              </div>

              <div
                onClick={() => {
                  setFilterStatus('Open');
                  setFilterOverdueOnly(false);
                  setActiveTab('tasks');
                }}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Open Tasks
                  </span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{metrics.openTasks}</span>
                  <span className="text-xs text-blue-600 font-medium">
                    +{metrics.inProgressTasks} In Progress
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {metrics.resolvedTasks} resolved so far today
                </p>
              </div>

              <div
                onClick={() => {
                  setFilterOverdueOnly(true);
                  setFilterStatus('ALL');
                  setActiveTab('tasks');
                }}
                className="bg-red-50/70 rounded-xl p-4 border border-red-200 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Overdue SLA Tasks
                  </span>
                  <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-red-700">
                    {metrics.overdueTasks}
                  </span>
                  <span className="text-xs text-red-600 font-semibold">Past SLA Deadline</span>
                </div>
                <p className="mt-1 text-[11px] text-red-700/80">
                  Click to view & reassign overdue tasks
                </p>
              </div>

              <div
                onClick={() => {
                  setFilterPriority('High');
                  setFilterOverdueOnly(false);
                  setActiveTab('tasks');
                }}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    High-Priority Cases
                  </span>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {metrics.highPriorityTasks}
                  </span>
                  <span className="text-xs text-purple-700 font-medium">Critical / VIP / NDR</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Includes Orders &gt; ₹{rules.highValueThreshold.toLocaleString('en-IN')}
                </p>
              </div>

              <div
                onClick={() => {
                  setFilterCategory(EXCEPTION_CATEGORIES.DATA_ERROR);
                  setFilterOverdueOnly(false);
                  setActiveTab('tasks');
                }}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                    Data Validation Errors
                  </span>
                  <XCircle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{metrics.dataErrors}</span>
                  <span className="text-xs text-rose-600 font-medium">Quarantined Rows</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Missing fields, invalid dates, duplicates
                </p>
              </div>
            </div>

            {/* Category Breakdown & Employee Workload Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 Cols: Exceptions by Category */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Exceptions by Rule Category
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any category bar to filter tasks immediately
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDraftRules(rules);
                      setShowRuleModal(true);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Configure Rules
                  </button>
                </div>

                <div className="space-y-3.5">
                  {[
                    {
                      cat: EXCEPTION_CATEGORIES.UNCONFIRMED,
                      ruleDesc: `Unconfirmed > ${rules.unconfirmedHours} hours`,
                      color: 'bg-blue-600'
                    },
                    {
                      cat: EXCEPTION_CATEGORIES.DISPATCH_DELAY,
                      ruleDesc: `Confirmed & Undispatched > ${rules.dispatchDelayHours} hours`,
                      color: 'bg-amber-500'
                    },
                    {
                      cat: EXCEPTION_CATEGORIES.SHIPMENT_DELAY,
                      ruleDesc: 'Dispatched & past expected delivery date',
                      color: 'bg-orange-500'
                    },
                    {
                      cat: EXCEPTION_CATEGORIES.FAILED_DELIVERY,
                      ruleDesc: 'Courier failed delivery attempt (NDR)',
                      color: 'bg-rose-600'
                    },
                    {
                      cat: EXCEPTION_CATEGORIES.HIGH_VALUE,
                      ruleDesc: `Order > ₹${rules.highValueThreshold.toLocaleString('en-IN')} past expected delivery`,
                      color: 'bg-purple-600'
                    },
                    {
                      cat: EXCEPTION_CATEGORIES.DATA_ERROR,
                      ruleDesc: 'Missing mandatory fields, invalid dates, or duplicate ID',
                      color: 'bg-red-700'
                    }
                  ].map((item) => {
                    const count = metrics.byCategory[item.cat] || 0;
                    const pct =
                      enrichedTasks.length > 0
                        ? Math.round((count / enrichedTasks.length) * 100)
                        : 0;
                    return (
                      <div
                        key={item.cat}
                        onClick={() => {
                          setFilterCategory(item.cat);
                          setFilterOverdueOnly(false);
                          setActiveTab('tasks');
                        }}
                        className="group p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div>
                            <span className="font-bold text-slate-800 group-hover:text-emerald-800">
                              {item.cat}
                            </span>
                            <span className="text-slate-400 ml-2 text-[11px]">
                              ({item.ruleDesc})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{count} tasks</span>
                            <span className="text-slate-400 text-[11px] w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 6 Cols: Employee Workload Matrix */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Employee-Wise Pending Action Matrix
                      </h3>
                      <p className="text-xs text-slate-500">
                        Monitor workload balance and overdue bottlenecks across support specialists
                      </p>
                    </div>
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                          <th className="py-2.5 pr-2">Employee</th>
                          <th className="py-2.5 px-2 text-center">Open</th>
                          <th className="py-2.5 px-2 text-center">In Progress</th>
                          <th className="py-2.5 px-2 text-center text-red-600">Overdue</th>
                          <th className="py-2.5 px-2 text-center text-purple-700">High Priority</th>
                          <th className="py-2.5 pl-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {EMPLOYEES.map((emp) => {
                          const stat = metrics.byEmployee[emp] || {
                            open: 0,
                            inProgress: 0,
                            overdue: 0,
                            highPriority: 0,
                            resolved: 0
                          };
                          return (
                            <tr key={emp} className="hover:bg-slate-50">
                              <td className="py-3 pr-2 font-semibold text-slate-800">{emp}</td>
                              <td className="py-3 px-2 text-center">
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold">
                                  {stat.open}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">
                                  {stat.inProgress}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {stat.overdue > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                                    {stat.overdue}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="font-semibold text-purple-700">
                                  {stat.highPriority}
                                </span>
                              </td>
                              <td className="py-3 pl-2 text-right">
                                <button
                                  onClick={() => {
                                    setFilterEmployee(emp);
                                    setFilterCategory('ALL');
                                    setActiveTab('tasks');
                                  }}
                                  className="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-0.5"
                                >
                                  View Queue <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Tip: Reassign tasks from overloaded agents in the Exception Tasks tab.</span>
                  <button
                    onClick={triggerChallenge5_ReassignOverdueTask}
                    className="text-amber-700 hover:text-amber-900 font-semibold underline"
                  >
                    Auto-Demo Overdue Reassignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: EXCEPTION TASKS & ASSIGNMENT QUEUE
        =================================================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Comprehensive Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Exception Follow-up Queue ({filteredTasks.length} of {enrichedTasks.length} tasks)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('ALL');
                      setFilterEmployee('ALL');
                      setFilterPriority('ALL');
                      setFilterStatus('ALL');
                      setFilterOverdueOnly(false);
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={handleDownloadDailyExceptionReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Exceptions CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Order ID, Customer, Phone..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">All Exception Types</option>
                  {Object.values(EXCEPTION_CATEGORIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Employee Filter */}
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">All Employees</option>
                  {EMPLOYEES.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* Overdue Toggle */}
                <label className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterOverdueOnly}
                    onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  Overdue Only ({metrics.overdueTasks})
                </label>
              </div>

              {/* Date Range Sub-row */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
                <span className="font-medium">Order Date Filter:</span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
                <span>to</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                      <th className="py-3 px-4">Order & Customer</th>
                      <th className="py-3 px-3">Value / Mode</th>
                      <th className="py-3 px-3">Exception & Reason</th>
                      <th className="py-3 px-3">Priority & SLA</th>
                      <th className="py-3 px-3">Recommended Action</th>
                      <th className="py-3 px-3">Assigned Employee</th>
                      <th className="py-3 px-4">Task Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          No exception tasks match the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <tr
                          key={task.taskKey}
                          className={`transition ${
                            task.isOverdue
                              ? 'bg-red-50/60 hover:bg-red-50'
                              : task.status === 'Resolved'
                              ? 'bg-emerald-50/30 text-slate-500'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Order & Customer */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{task.orderId}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {task.orderStatus}
                              </span>
                            </div>
                            <div className="font-medium text-slate-800 mt-0.5">
                              {task.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {task.phoneNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Ordered: {task.orderDate}
                            </div>
                          </td>

                          {/* Order Value & Payment */}
                          <td className="py-3.5 px-3 align-top">
                            <div className="font-bold text-slate-900">
                              {typeof task.orderValue === 'number'
                                ? `₹${task.orderValue.toLocaleString('en-IN')}`
                                : String(task.orderValue)}
                            </div>
                            <span
                              className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                task.paymentType === 'COD'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {task.paymentType}
                            </span>
                          </td>

                          {/* Exception Category & Reason */}
                          <td className="py-3.5 px-3 align-top max-w-xs">
                            <div>{getCategoryBadge(task.category)}</div>
                            <p className="mt-1.5 text-slate-700 leading-snug">{task.reason}</p>
                          </td>

                          {/* Priority & SLA Status */}
                          <td className="py-3.5 px-3 align-top whitespace-nowrap">
                            <div>{getPriorityBadge(task.priority)}</div>
                            <div className="mt-2">
                              {task.status === 'Resolved' ? (
                                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Completed
                                </span>
                              ) : task.isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tracking-wide uppercase shadow-sm">
                                  <AlertTriangle className="w-3 h-3" /> OVERDUE (
                                  {Math.abs(task.hoursRemaining)}h ago)
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-600 font-medium">
                                  Due in {task.hoursRemaining}h
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Recommended Action */}
                          <td className="py-3.5 px-3 align-top max-w-xs">
                            <div className="p-2 rounded-lg bg-slate-100/80 border border-slate-200/80 text-slate-800 text-[11px] font-medium">
                              {task.recommendedAction}
                            </div>
                          </td>

                          {/* Assigned Employee Reassignment Dropdown */}
                          <td className="py-3.5 px-3 align-top">
                            <select
                              value={task.assignedEmployee}
                              onChange={(e) =>
                                handleEmployeeReassign(task.taskKey, e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                              {EMPLOYEES.map((emp) => (
                                <option key={emp} value={emp}>
                                  {emp}
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Select to reassign & log audit
                            </div>
                          </td>

                          {/* Task Status Selector */}
                          <td className="py-3.5 px-4 align-top">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.taskKey, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border cursor-pointer focus:outline-none ${
                                task.status === 'Resolved'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : task.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: UPLOADED ORDERS & VALIDATION INSPECTOR
        =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Source Order Dataset Inspector ({evaluatedSummary.evaluatedOrders.length} Rows)
                </h2>
                <p className="text-xs text-slate-500">
                  Complete view of all uploaded D2C orders, validation status, and triggered rules per order.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload New CSV
                </button>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" /> Download Current 105-Row CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">Order Date</th>
                      <th className="py-3 px-3">Customer & Phone</th>
                      <th className="py-3 px-3">Value / Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Dispatch / Expected</th>
                      <th className="py-3 px-3">Assigned</th>
                      <th className="py-3 px-3">Rule Evaluation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {evaluatedSummary.evaluatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500">
                          No orders uploaded yet. Click &quot;Upload New CSV&quot; to load order data.
                        </td>
                      </tr>
                    ) : (
                      evaluatedSummary.evaluatedOrders.map((o, idx) => (
                      <tr
                        key={`${o.orderId}-${idx}`}
                        className={
                          !o.isValid
                            ? 'bg-red-50/70'
                            : o.exceptionCount > 0
                            ? 'bg-amber-50/30'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {o.orderId || <span className="text-red-600">MISSING</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {o.orderDate || <span className="text-red-600">MISSING</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">
                            {o.customerName || <span className="text-red-600">MISSING NAME</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {o.phoneNumber || <span className="text-red-600">MISSING PHONE</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold">₹{String(o.orderValue)}</div>
                          <div className="text-[10px] text-slate-500">{o.paymentType}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{o.orderStatus}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          <div>Disp: {o.dispatchDate || '—'}</div>
                          <div>Exp: {o.expectedDeliveryDate || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{o.assignedEmployee}</td>
                        <td className="py-2.5 px-3">
                          {o.exceptions.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Healthy (No Exception)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {o.exceptions.map((ex) => (
                                <span key={ex}>{getCategoryBadge(ex)}</span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: DAILY EXCEPTION REPORT
        =================================================================== */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Automated Daily Operations Summary
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  NaturaX Daily D2C Order Exception Report — Oct 20, 2026
                </h2>
                <p className="text-xs text-slate-500">
                  Consolidated executive report of new exceptions, unresolved backlog, overdue SLAs, high-value escalations, and agent pending queues.
                </p>
              </div>
              <button
                onClick={handleDownloadDailyExceptionReport}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Download Daily Exception Report (CSV)
              </button>
            </div>

            {/* Report Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold">New Exceptions Today</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {enrichedTasks.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Across {metrics.uniqueOrdersWithExceptions} unique orders
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-amber-700 font-semibold">Unresolved Exceptions</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">
                  {metrics.openTasks + metrics.inProgressTasks}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {metrics.openTasks} Open, {metrics.inProgressTasks} In Progress
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="text-xs text-red-700 font-bold">Overdue Tasks (SLA Breached)</div>
                <div className="text-2xl font-extrabold text-red-700 mt-1">
                  {metrics.overdueTasks}
                </div>
                <div className="text-[11px] text-red-600 mt-1">
                  Requires immediate manager reassignment
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="text-xs text-purple-800 font-bold">
                  High-Priority & VIP Cases
                </div>
                <div className="text-2xl font-extrabold text-purple-900 mt-1">
                  {metrics.highPriorityTasks}
                </div>
                <div className="text-[11px] text-purple-700 mt-1">
                  Includes VIP (&gt;₹{rules.highValueThreshold}), NDR & Shipment Delays
                </div>
              </div>
            </div>

            {/* High-Priority & Overdue Escalation List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Priority Escalation Watchlist (Overdue & High-Value Undelivered Orders)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                      <th className="py-2 px-3">Order ID</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Value</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Owner</th>
                      <th className="py-2 px-3">SLA Status</th>
                      <th className="py-2 px-3">Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrichedTasks
                      .filter(
                        (t) =>
                          t.status !== 'Resolved' &&
                          (t.isOverdue || t.category === EXCEPTION_CATEGORIES.HIGH_VALUE)
                      )
                      .slice(0, 15)
                      .map((t) => (
                        <tr key={t.taskKey} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold">{t.orderId}</td>
                          <td className="py-2.5 px-3">{t.customerName}</td>
                          <td className="py-2.5 px-3 font-semibold">
                            ₹{Number(t.orderValue).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">{getCategoryBadge(t.category)}</td>
                          <td className="py-2.5 px-3 font-medium">{t.assignedEmployee}</td>
                          <td className="py-2.5 px-3">
                            {t.isOverdue ? (
                              <span className="text-red-600 font-bold">OVERDUE</span>
                            ) : (
                              <span className="text-amber-700 font-semibold">Active VIP</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{t.recommendedAction}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: PERSISTENT AUDIT TRAIL
        =================================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-700" />
                  System Audit Trail & Accountability Log ({auditLogs.length} Events)
                </h2>
                <p className="text-xs text-slate-500">
                  Every status change, employee reassignment, rule modification, and CSV upload is permanently recorded with timestamps.
                </p>
              </div>
              <button
                onClick={triggerChallenge5_ReassignOverdueTask}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                Simulate Overdue Task Reassignment Now
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-3">Order / Scope</th>
                      <th className="py-3 px-3">Action Type</th>
                      <th className="py-3 px-3">Transition (Previous → New)</th>
                      <th className="py-3 px-3">Detailed Description</th>
                      <th className="py-3 px-4">Responsible User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No audit events recorded yet. Upload a CSV file to start tracking operations.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{log.orderId}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 line-through mr-1.5">
                            {log.previousValue}
                          </span>
                          <span className="text-slate-400 mr-1.5">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                            {log.newValue}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-md">{log.details}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{log.user}</td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================
          RULE ENGINE CONFIGURATION MODAL (LIVE INTERVIEW CHALLENGE #3)
      =================================================================== */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Configurable Rule Engine Thresholds
                </h3>
              </div>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ESC
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Rule 1: Unconfirmed Order Threshold (Hours)
                </label>
                <p className="text-slate-500 mb-1.5">
                  Flag orders that remain in &quot;Unconfirmed&quot; status longer than this duration.
                </p>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={draftRules.unconfirmedHours}
                  onChange={(e) =>
                    setDraftRules({ ...draftRules, unconfirmedHours: Number(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-amber-950 mb-1">
                    Rule 2: Dispatch Delay Threshold (Hours) — [Live Challenge #3]
                  </label>
                  <button
                    type="button"
                    onClick={() => setDraftRules({ ...draftRules, dispatchDelayHours: 12 })}
                    className="text-[11px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded"
                  >
                    Set to 12h
                  </button>
                </div>
                <p className="text-amber-800 mb-1.5">
                  Flag &quot;Confirmed&quot; orders that have not been dispatched within this window (Default: 24h).
                </p>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draftRules.dispatchDelayHours}
                  onChange={(e) =>
                    setDraftRules({
                      ...draftRules,
                      dispatchDelayHours: Number(e.target.value) || 1
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Rule 5: High-Value VIP Order Threshold (₹ INR)
                </label>
                <p className="text-slate-500 mb-1.5">
                  Escalate undelivered orders exceeding this value past their expected delivery date.
                </p>
                <input
                  type="number"
                  step={500}
                  min={1000}
                  value={draftRules.highValueThreshold}
                  onChange={(e) =>
                    setDraftRules({
                      ...draftRules,
                      highValueThreshold: Number(e.target.value) || 5000
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyRules(draftRules)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm"
              >
                Save & Re-Evaluate All {rawOrders.length} Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}