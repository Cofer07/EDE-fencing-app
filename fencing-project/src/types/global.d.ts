export {};
declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      listFencers: (search: string) => Promise<Array<{id:number;name:string;club?:string;weapon?:string;is_valid:0|1}>>;
      updateFencerValidity: (ids:number[], isValid:boolean) => Promise<{updated:number;value:0|1}>;
      swissReset: () => Promise<{ success: boolean; error?: string }>;
      fullReset: () => Promise<{ success: boolean; error?: string }>;
      swissDebugCounts: () => Promise<{ success: boolean; t:number; r:number; m:number; lastRound:number; error?:string }>;
    };
  }
}
