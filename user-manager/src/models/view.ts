export interface IView {
  id: string; // Generic id field that can be userqueryid or savedqueryid
  userqueryid?: string; // For personal views
  savedqueryid?: string; // For system views
  name: string;
  fetchxml: string;
  layoutxml: string;
  type: 'personal' | 'system'; // To distinguish between personal and system views
  ownerid?: any; // For personal views - who owns the view
  isdefault?: boolean; // For system views - whether this is the default view
} 