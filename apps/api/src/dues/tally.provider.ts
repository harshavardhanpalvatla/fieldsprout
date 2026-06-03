export const TALLY_PROVIDER = 'TALLY_PROVIDER';

export interface TallyDuesRow {
  distributorRef: string;
  invoiceRef: string;
  amount: number;
  dueDate?: string;
}

export interface TallyProvider {
  fetchDues(): Promise<TallyDuesRow[]>;
}

// Matching key: distributor.phone must match Tally's distributorRef field
export class FakeTallyProvider implements TallyProvider {
  fetchDues(): Promise<TallyDuesRow[]> {
    return Promise.resolve([
      { distributorRef: '+919876543210', invoiceRef: 'INV-001', amount: 15000, dueDate: '2026-06-30' },
      { distributorRef: '+919876543211', invoiceRef: 'INV-002', amount: 8500 },
      { distributorRef: '+919876543210', invoiceRef: 'INV-003', amount: 22000 },
    ]);
  }
}
