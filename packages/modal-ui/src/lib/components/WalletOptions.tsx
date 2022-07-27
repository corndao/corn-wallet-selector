import React, { useEffect, useState } from "react";
import type {
  WalletSelector,
  ModuleState,
  Wallet,
} from "@near-wallet-selector/core";

import type { ModalOptions } from "../modal.types";

interface WalletOptionsProps {
  selector: WalletSelector;
  options: ModalOptions;
  onWalletNotInstalled: (module: ModuleState) => void;
  onConnectHardwareWallet: () => void;
  onConnected: () => void;
  onConnecting: (wallet: Wallet) => void;
  onError: (error: Error) => void;
}

export const WalletOptions: React.FC<WalletOptionsProps> = ({
  selector,
  options,
  onWalletNotInstalled,
  onError,
  onConnectHardwareWallet,
  onConnecting,
  onConnected,
}) => {
  const [modules, setModules] = useState<Array<ModuleState>>([]);

  useEffect(() => {
    const subscription = selector.store.observable.subscribe((state) => {
      state.modules.sort((current, next) => {
        if (current.metadata.deprecated === next.metadata.deprecated) {
          return 0;
        }

        return current.metadata.deprecated ? 1 : -1;
      });
      setModules(state.modules);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWalletClick = (module: ModuleState) => async () => {
    try {
      const { deprecated, available } = module.metadata;

      if (module.type === "injected" && !available) {
        return onWalletNotInstalled(module);
      }

      if (deprecated) {
        return onError(
          new Error(
            `${module.metadata.name} is deprecated. Please select another wallet.`
          )
        );
      }

      const wallet = await module.wallet();
      onConnecting(wallet);

      if (wallet.type === "hardware") {
        return onConnectHardwareWallet();
      }

      await wallet.signIn({
        contractId: options.contractId,
        methodNames: options.methodNames,
      });

      onConnected();
    } catch (err) {
      const { name } = module.metadata;

      const message =
        err instanceof Error ? err.message : "Something went wrong";

      onError(new Error(`Failed to sign in with ${name}: ${message}`));
    }
  };

  return (
    <div className="wallet-options-wrapper">
      <ul className={"options-list"}>
        {modules.reduce<Array<JSX.Element>>((result, module) => {
          const { selectedWalletId } = selector.store.getState();
          const { name, description, iconUrl, deprecated } = module.metadata;
          const selected = module.id === selectedWalletId;
          result.push(
            <li
              key={module.id}
              id={module.id}
              className={
                (selected ? "selected-wallet" : "") +
                (deprecated ? " deprecated-wallet" : "")
              }
              onClick={selected ? undefined : handleWalletClick(module)}
            >
              <div title={description || ""} className="wallet-content">
                <div>{name}</div>
                <div className="wallet-img-box">
                  <img src={iconUrl} alt={name} />
                </div>
                {selected && (
                  <div className="selected-wallet-text">
                    <span>selected</span>
                  </div>
                )}
              </div>
            </li>
          );

          return result;
        }, [])}
      </ul>
    </div>
  );
};
