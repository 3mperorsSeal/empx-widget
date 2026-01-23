import create from 'zustand';

export const useStore = create((set) => ({
    route: [],
    path: [],
    adapter: [],
    setRoute: (route: any) => set({ route }),
    setPath: (path: string[]) => set({ path }),
    setAdapter: (adapter: any) => set({ adapter }),
}));