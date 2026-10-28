// ============================================================================
// store/uiStore.ts — Zustand store for UI state
//
// Manages panel visibility, modal state, responsive breakpoints,
// and general UI preferences.
// ============================================================================

import { create } from 'zustand';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface UIState {
  // Responsive breakpoints
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowWidth: number;

  // Panel visibility
  showPalette: boolean;
  showProperties: boolean;
  showSimResults: boolean;
  showChat: boolean;

  // Collapse states (sidebar compact mode)
  paletteCollapsed: boolean;
  propertiesCollapsed: boolean;

  // Mobile overlays
  mobileMenuOpen: boolean;
  mobilePaletteOpen: boolean;
  mobilePropertiesOpen: boolean;

  // Modal
  modalOpen: boolean;
  modalContent: 'save' | 'load' | 'settings' | 'help' | null;

  // Notifications
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>;

  // Actions
  setWindowWidth: (width: number) => void;
  togglePalette: () => void;
  toggleProperties: () => void;
  toggleSimResults: () => void;
  toggleChat: () => void;
  togglePaletteCollapsed: () => void;
  togglePropertiesCollapsed: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setMobilePaletteOpen: (open: boolean) => void;
  setMobilePropertiesOpen: (open: boolean) => void;
  openModal: (content: 'save' | 'load' | 'settings' | 'help') => void;
  closeModal: () => void;
  addNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  removeNotification: (id: string) => void;
}

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export const useUIStore = create<UIState>((set, get) => ({
  breakpoint: getBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1200),
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
  isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,

  showPalette: true,
  showProperties: true,
  showSimResults: false,
  showChat: false,

  paletteCollapsed: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  propertiesCollapsed: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,

  mobileMenuOpen: false,
  mobilePaletteOpen: false,
  mobilePropertiesOpen: false,

  modalOpen: false,
  modalContent: null,
  notifications: [],

  setWindowWidth: (width: number) => {
    const bp = getBreakpoint(width);
    set({
      windowWidth: width,
      breakpoint: bp,
      isMobile: bp === 'mobile',
      isTablet: bp === 'tablet',
      isDesktop: bp === 'desktop',
      // Auto-collapse on smaller screens
      paletteCollapsed: bp !== 'desktop',
      propertiesCollapsed: bp !== 'desktop',
      // Close mobile overlays when resizing to desktop
      ...(bp === 'desktop' ? {
        mobilePaletteOpen: false,
        mobilePropertiesOpen: false,
        mobileMenuOpen: false,
      } : {}),
    });
  },

  togglePalette: () => set({ showPalette: !get().showPalette }),
  toggleProperties: () => set({ showProperties: !get().showProperties }),
  toggleSimResults: () => set({ showSimResults: !get().showSimResults }),
  toggleChat: () => set({ showChat: !get().showChat }),

  togglePaletteCollapsed: () => set({ paletteCollapsed: !get().paletteCollapsed }),
  togglePropertiesCollapsed: () => set({ propertiesCollapsed: !get().propertiesCollapsed }),

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setMobilePaletteOpen: (open) => set({ mobilePaletteOpen: open }),
  setMobilePropertiesOpen: (open) => set({ mobilePropertiesOpen: open }),

  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),

  addNotification: (message, type) => {
    const existing = get().notifications;
    const now = Date.now();

    // Deduplicate: ignore if same message was added within the last 2 seconds
    const isDuplicate = existing.some(
      n => n.message === message && now - n.timestamp < 2000
    );
    if (isDuplicate) return;

    const id = `notif-${now}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Keep max 3 notifications to prevent clutter
    const trimmed = existing.length >= 3 ? existing.slice(existing.length - 2) : existing;

    set({
      notifications: [
        ...trimmed,
        { id, message, type, timestamp: now },
      ],
    });

    // Auto-remove after 2.8 seconds
    setTimeout(() => {
      set({
        notifications: get().notifications.filter(n => n.id !== id),
      });
    }, 2800);
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  },
}));

// Initialize resize listener
if (typeof window !== 'undefined') {
  let resizeTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      useUIStore.getState().setWindowWidth(window.innerWidth);
    }, 100);
  });
}
