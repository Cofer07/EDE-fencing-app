declare global {
  interface Window {
    api: {
      // Divisions
      divisionsCreate: () => Promise<{success:boolean; created?: {id:number; name:string; size:number}[]; error?:string}>;
      divisionsList: () => Promise<{id:number; name:string; size:number}[]>;
      divisionState: (divisionId:number) => Promise<{division:any; fencers:any[]; matches:any[]}>;
      divisionReport: (matchId:number, aScore:number, bScore:number) => Promise<{success:boolean; error?:string}>;
    };
  }
}
export {};
