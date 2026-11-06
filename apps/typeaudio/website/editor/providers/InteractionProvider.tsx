import { type ReactNode } from "react";
import { Context } from "../interactions/context.ts";
import { useContextMenu } from "../hooks/interactions/useContextMenu.ts";
import { useTooltip } from "../hooks/interactions/useTooltip.ts";
import { ContextMenu } from "../components/molecules/ContextMenu.tsx";
import { Tooltip } from "../components/atoms/Tooltip.tsx";
export function InteractionProvider({ children }: { children: ReactNode }) {
  const { menu, menuRef, openMenu, dismiss, choose } = useContextMenu(),
    { tip, hideTip } = useTooltip(menuRef);
  return (
    <Context.Provider
      value={{
        menuKey: menu?.key,
        openMenu: (...args) => {
          hideTip();
          openMenu(...args);
        },
        closeMenu: () => dismiss(),
      }}
    >
      {children}
      {menu && (
        <ContextMenu
          menu={menu}
          menuRef={menuRef}
          dismiss={dismiss}
          choose={choose}
        />
      )}
      {tip && !menu && <Tooltip tip={tip} />}
    </Context.Provider>
  );
}
