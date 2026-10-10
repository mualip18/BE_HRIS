export interface SettingsMenuItem {
  title: string;
  icon: string;
  to?: string;
  children?: SettingsMenuItem[];
}

export interface SettingsMenuResponse {
  success: boolean;
  isEmployee: boolean;
  isActiveEmployee: boolean;
  data: SettingsMenuItem[];
}