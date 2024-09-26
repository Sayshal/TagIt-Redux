import { RemoveForm } from "./remove.js";
import { SettingsForm } from "./settingsForm.js";
import { ColorsForm } from "./colorsForm.js";

export const modName = "TagIt! Redux";
export const mod = "tagit-redux";

/**
 * Provides functionality for interaction with module settings
 *
 * @export
 * @class Settings
 */
export class Settings {
  /**
   * Registers all of the necessary game settings for the module
   *
   * @static
   * @memberof Settings
   */
  static registerSettings() {
    game.settings.register(mod, "defaultColor", {
      name: "Default Tag Color",
      scope: "world",
      config: false,
      default: {
        tag: {
          tag: "#8c0000",
          text: "#ffffff",
        },
        document: {
          tag: "#ffff00",
          text: "#000000",
        },
      },
      type: Object,
    });

    game.settings.register(mod, "defaultSort", {
      name: "Default Sort",
      hint: "Lower values before higher values, then by name",
      scope: "world",
      config: true,
      default: 100,
      type: Number,
    });

    game.settings.registerMenu(mod, "defaultColor", {
      name: "Default Colors",
      label: "Colors",
      title: "Default Colors",
      hint: "Modify the default colors used",
      icon: "fas fa-fill-drip",
      type: ColorsForm,
      restricted: true,
    });

    game.settings.registerMenu(mod, "settingsMenu", {
      name: "Update Tags",
      label: "Modify",
      hint: "Allow modifying and removing tags throughout system.",
      icon: "fas fa-wrench",
      type: SettingsForm,
      restricted: true,
    });

    game.settings.registerMenu(mod, "removeButton", {
      name: "Remove all tags",
      label: "Remove All",
      hint: "[WARNING] This removes all tags from every entity!",
      icon: "fas fa-trash",
      type: RemoveForm,
      restricted: true,
    });
  }
}
