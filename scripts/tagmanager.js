import { mod } from "./settings.js";
import { TagItPackCache } from "./packcache.js";
import { TagItIndex, tagsort } from "./index.js";

export class TagItTagManager {
  static async getUsedTags() {
    let tags = new Set();

    const journaltags = game.journal
      .filter((a) => a.data.flags?.tagit?.tags?.length > 0)
      .map((a) => {
        return a.data.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        });
      })
      .flat();

    const scenetags = game.scenes
      .filter((a) => a.data.flags?.tagit?.tags?.length > 0)
      .map((a) => {
        return a.data.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        });
      })
      .flat();

    const actortags = game.actors
      .filter((a) => a.data.flags?.tagit?.tags?.length > 0)
      .map((a) => {
        return a.data.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        });
      })
      .flat();

    const itemtags = game.items
      .filter((a) => a.data.flags?.tagit?.tags?.length > 0)
      .map((a) => {
        return a.data.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        });
      })
      .flat();

    const tokentags = game.scenes
      .filter((a) =>
        a.tokens.some(
          (b) => !b.isLinked && b.data.flags?.tagit?.tags?.length > 0
        )
      )
      .flatMap((a) => a.tokens.contents)
      .filter((a) => !a.isLinked)
      .map((a) =>
        a.data.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        })
      )
      .flat();

    const packtags = TagItPackCache.TagIndex.flatMap((a) => a.items)
      .map((a) =>
        a.flags.tagit.tags.filter((b) => {
          if (tags.has(b.tag)) {
            return false;
          }
          tags.add(b.tag);
          return true;
        })
      )
      .flat();

    return [
      ...new Set(
        [].concat(
          journaltags,
          scenetags,
          actortags,
          itemtags,
          tokentags,
          packtags
        )
      ),
    ].sort((a, b) => a.tag.localeCompare(b.tag));
  }

  static getUsedTagsWithMeta() {
    //let tags = new Set();

    const tags = [];

    for (const document of TagItIndex.Index) {
      for (const tag of document.tags) {
        if (
          tag.meta &&
          !tags.some((a) => a.tag == tag.tag && a.meta == tag.meta)
        ) {
          tags.push(tag);
        } else if (!tags.some((a) => a.tag == tag.tag)) {
          tags.push(tag);
        }
      }
    }

    return tags.sort(tagsort);

    // return [...tags]
    // .sort((a,b) => {
    //     const A = a.split(':');
    //     const B = b.split(':');

    //     if (A.length == 1 && B.length == 1) {
    //         // Two single tags
    //         return a.localeCompare(b);
    //     }

    //     if (A.length == 2 && B.length == 2) {
    //         // Two meta tags
    //         const meta = A[0].localeCompare(B[0]);

    //         if (meta != 0) {
    //             return meta;
    //         }

    //         return A[1].localeCompare(B[1]);
    //     }

    //     if (A.length == 1 && B.length == 2) {
    //         // Left is no meta, right is meta
    //         return -1;
    //     }

    //     if (A.length == 2 && B.length == 1) {
    //         // Left is meta, right is no meta, swap
    //         return 1;
    //     }

    //     // Should never get to.

    //     return a.localeCompare(b);
    // });
  }

  static async removeAll() {
    const promises = [];

    for (const document of game.journal.filter(
      (a) => a.data.flags?.tagit?.tags?.length > 0
    )) {
      promises.push(document.unsetFlag(mod, "tags"));
    }

    for (const document of game.scenes.filter(
      (a) => a.data.flags?.tagit?.tags?.length > 0
    )) {
      promises.push(document.unsetFlag(mod, "tags"));
    }

    for (const document of game.actors.filter(
      (a) => a.data.flags?.tagit?.tags?.length > 0
    )) {
      promises.push(document.unsetFlag(mod, "tags"));
    }

    for (const document of game.items.filter(
      (a) => a.data.flags?.tagit?.tags?.length > 0
    )) {
      promises.push(document.unsetFlag(mod, "tags"));
    }

    for (const pack of TagItPackCache.TagIndex) {
      for (const index of pack.items) {
        const document = await game.packs
          .get(`${pack.pack}.${pack.name}`)
          .getDocument(index._id);

        promises.push(document.unsetFlag(mod, "tags"));
      }
    }

    for (const scene of game.scenes.filter((a) =>
      a.tokens.some((b) => !b.isLinked && b.data.flags?.tagit?.tags?.length > 0)
    )) {
      for (const document of scene.tokens.filter(
        (a) => !a.isLinked && a.data.flags?.tagit?.tags?.length > 0
      )) {
        promises.push(document.unsetFlag(mod, "tags"));
      }
    }

    await Promise.all(promises);
    await TagItPackCache.init();

    ui.notifications.info(`Removed tags from ${promises.length} documents.`);
  }
}
