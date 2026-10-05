// Re-export the native module. On web, it will be resolved to FocusOngoingModule.web.ts
// and on native platforms to FocusOngoingModule.ts
export { default } from './src/FocusOngoingModule';
export * from './src/FocusOngoing.types';
