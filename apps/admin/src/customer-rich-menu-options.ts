import {
  resolveRuntimeLineMenus,
  type LineExperienceSettings
} from "@amami-line-crm/domain";

const LEGACY_LINE_RICH_MENU_TYPES = new Set(["initial", "negotiation", "aftercare"]);

export interface CustomerRichMenuSwitchOption {
  menu_type: string;
  name: string;
  line_rich_menu_id: string | undefined;
  description: string;
  switch_available: boolean;
}

export function buildCustomerRichMenuSwitchOptions(
  settings: LineExperienceSettings
): CustomerRichMenuSwitchOption[] {
  return resolveRuntimeLineMenus(settings, { includeRetired: false }).map((menu) => {
    const itemLabels = menu.items
      .slice(0, 2)
      .map((item) => item.label)
      .join("・");

    return {
      menu_type: menu.menu_type,
      name: menu.name,
      line_rich_menu_id: menu.line_rich_menu_id,
      description: `${itemLabels}${itemLabels ? " など" : ""}${menu.items.length}つのメニュー`,
      switch_available:
        Boolean(menu.line_rich_menu_id?.trim()) ||
        LEGACY_LINE_RICH_MENU_TYPES.has(menu.menu_type)
    };
  });
}
