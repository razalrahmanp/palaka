// Analytics Types - Centralized type definitions

export interface KPIData {
  mtdRevenue: number;
  quotePipeline: {
    draft: number;
    pending: number;
    approved: number;
    totalValue: number;
  };
  customOrdersPending: number;
  lowStockItems: number;
  openPurchaseOrders: {
    count: number;
    value: number;
  };
  onTimeDeliveryRate: number;
}

export interface SalesAnalytics {
  revenuetrend: Array<{
    month: string;
    revenue: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  quotesFunnel: Array<{
    status: string;
    count: number;
    value: number;
  }>;
  receivablesAging: Array<{
    range: string;
    amount: number;
    count: number;
  }>;
}

export interface InventoryAnalytics {
  stockByCategory: Array<{
    category: string;
    totalQuantity: number;
    value: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    currentStock: number;
    reorderPoint: number;
    category: string;
    supplier: string;
  }>;
  stockMovement: Array<{
    date: string;
    inbound: number;
    outbound: number;
  }>;
}

export interface ProductionAnalytics {
  workOrdersStatus: Array<{
    status: string;
    count: number;
  }>;
  productionOutput: Array<{
    date: string;
    completed: number;
    defects: number;
  }>;
  efficiency: {
    overall: number;
    byWorkCenter: Array<{
      name: string;
      efficiency: number;
    }>;
  };
}

export interface ProcurementAnalytics {
  customOrdersRequiringPO: Array<{
    id: string;
    quoteId: string;
    customer: string;
    description: string;
    quantity: number;
    status: string;
    estimatedCost: number;
  }>;
  supplierPerformance: Array<{
    supplier: string;
    poCount: number;
    totalValue: number;
    avgLeadTime: number;
    onTimeRate: number;
  }>;
  pendingApprovals: Array<{
    id: string;
    supplier: string;
    amount: number;
    requestedDate: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
}

export interface LogisticsAnalytics {
  deliveriesByStatus: Array<{
    status: string;
    count: number;
  }>;
  routeEfficiency: Array<{
    route: string;
    plannedTime: number;
    actualTime: number;
    efficiency: number;
  }>;
  driverPerformance: Array<{
    driver: string;
    deliveries: number;
    onTimeRate: number;
    rating: number;
  }>;
}

export interface DashboardData {
  kpis: KPIData;
  sales: SalesAnalytics;
  inventory: InventoryAnalytics;
  production: ProductionAnalytics;
  procurement: ProcurementAnalytics;
  logistics: LogisticsAnalytics;
  lastUpdated: string;
}
