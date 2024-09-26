import { mod } from "./settings.js";
import { TagItIndex, tagsort } from "./index.js";

export class TagItSearch extends FormApplication {
  constructor(object, options) {
    super(object, options);

    this.searchOptions = {
      limit: 20,
    };
  }

  static get defaultOptions() {
    const options = super.defaultOptions;

    options.template = `modules/${mod}/templates/search.html`;
    options.width = "525";
    options.height = "500";
    options.title = game.i18n.localize("TagIt.Search.title");
    options.resizable = true;
    options.editable = true;

    return options;
  }

  async getData() {
    const _this = this;
    const data = super.getData();

    // _this.tagcache = await TagItTagManager.getUsedTags();

    // data.tagcache = _this.tagcache;
    data.appId = this.appId;

    return data;
  }

  activateListeners(html) {
    const _this = this;
    super.activateListeners(html);

    $(".entity-filter", html).change(function () {
      _this._renderResults();
    });

    $(`#taginput${_this.appId}`, html).on("keypress", async function (event) {
      if (event.keyCode === 13) {
        event.preventDefault();

        const searchString = $(this).val();

        console.log(`TagIt: Search initiated '${searchString}'`);

        const results = await TagItSearch.search(
          searchString,
          _this.searchOptions
        );

        _this._renderResults(
          results.sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    });

    $(`div.tagit.tag.input button`, html).on("click", async function () {
      const searchOptions = await renderTemplate(
        `modules/${mod}/templates/search-options.html`,
        _this.searchOptions
      );
      new Dialog({
        title: "Search Options",
        content: searchOptions,
        buttons: {
          ok: {
            label: "Ok",
            callback: async (dialog) => {
              _this.searchOptions.limit = $("#search-limit", dialog).val();
            },
          },
        },
        default: "ok",
      }).render(true);
    });

    $(`#taginput${_this.appId}`, html).focus();
  }

  async _updateObject(event, formData) {
    return;
  }

  _renderResults(results) {
    const _this = this;

    $(".search.directory-list", _this.element).empty();

    if (results.length === 0) {
      // No need to render any objects.
      return;
    }

    results.forEach((a) => {
      let item = $("<li>")
        .attr("data-document-id", a.id)
        .attr("data-type", a.entity)
        .addClass("directory-item")
        .addClass("tagit-search-item")
        .addClass("flexrow")
        .css({ display: "flex" });

      if (a.img) {
        $(item).append(
          $("<img>")
            .addClass("profile")
            .attr("src", a.img)
            .attr("title", a.name)
        );
      }

      $(item).append(
        $("<div>")
          .addClass("entry-name")
          .append($("<h4>").append($("<a>").text(a.name)))
      );

      $("div.entry-name", item).append(
        $("<div>")
          .addClass("tag")
          .addClass("collection")
          .append(
            $("<span>")
              .addClass("tagit")
              .addClass("tag")
              .addClass("entity-type")
              .css({
                "background-color": game.settings.get(mod, "defaultColor")
                  .document.tag,
                "border-color": game.settings.get(mod, "defaultColor").document
                  .tag,
                color: game.settings.get(mod, "defaultColor").document.text,
              })
              .text(a.documentName)
          )
      );

      const dragData = {
        id: a.id,
        type: a.documentName,
      };

      if (a.compendium) {
        dragData.pack = a.compendium;

        $(item).attr("data-pack", a.compendium);

        $(item).append(
          $("<div>")
            .addClass("entity-info")
            .append($("<p>").text(`(${a.compendium})`))
        );
      }

      switch (a.documentName) {
        case "JournalEntry":
        case "Scene":
        case "Actor":
        case "Item":
          $(item)
            .attr("draggable", "true")
            .on("dragstart", function (e) {
              e.originalEvent.dataTransfer.setData(
                "text/plain",
                JSON.stringify(dragData)
              );
            });

          $("a", item).on("click", async function () {
            const d = await a.document;
            d.sheet.render(true);
          });

          break;
        case "Token":
          $(item).addClass("token");

          $("a", item).on("click", function () {
            a.actor.sheet.render(true);
          });

          break;
      }

      const collectionElement = $("div.tag.collection", item);

      if (a.tags) {
        for (const tag of a.tags) {
          let tagtext = "";

          if (tag.meta && (tag.displayMeta === undefined || tag.displayMeta)) {
            tagtext = `${tag.meta}:${tag.tag}`;
          } else if (tag.value) {
            tagtext = `${tag.tag}:${tag.value}`;
          } else {
            tagtext = `${tag.tag}`;
          }

          const span = $("<span>")
            .addClass("tagit")
            .addClass("tag")
            .text(tagtext);

          const color = game.settings.get(mod, "defaultColor").tag;

          if (tag.color) {
            color.tag = tag.color.tag;
            color.text = tag.color.text;
          }

          $(span).css({
            "background-color": color.tag,
            "border-color": color.tag,
            color: color.text,
          });

          $(collectionElement).append(span);
        }
      }

      $(".search.directory-list", _this.element).append(item);
    });
  }

  static reservedTokens = ["n", "name", "t", "type", "document-type", "tag"];

  static tokenizer(str) {
    str = str.trim();
    let index = 0;
    let length = str.length;
    const tokens = [];

    let sQuote = false;
    let dQuote = false;
    let parenDepth = 0;

    let tokenStart = 0;
    let tokenClose = 0;

    tokenClose = [];

    while (index < length) {
      switch (str[index]) {
        case "\\":
          // Encountered an escape
          // Look ahead
          index++;

          switch (str[index]) {
            case '"':
            case "'":
            case "(":
            case ")":
              // Escaping values
              index++;
              break;
          }
          continue;
        case "'":
          if (parenDepth > 0) {
            // In a parenthetical
            break;
          } else if (dQuote) {
            // Encountered singlequote within doublequote
            break;
          } else if (sQuote) {
            // Encountered singlequote after finding one earlier
            sQuote = false;

            // push token
            // start = 1
            // end = index - 1
            tokenClose.push({
              start: 1,
              end: index,
              offset: 0,
              recurse: false,
            });
          } else if (index == 0) {
            sQuote = true;
          }

          break;
        case '"':
          if (parenDepth > 0) {
            // In a parenthetical
            break;
          } else if (sQuote) {
            // Encountered doublequote within singlequote
            break;
          } else if (dQuote) {
            //In a doublequote
            dQuote = false;

            // push token
            // start = 1
            // end = index - 1

            tokenClose.push({
              start: 1,
              end: index,
              offset: 0,
              recurse: false,
            });
          } else if (index == 0) {
            dQuote = true;
          }

          break;
        case "(":
          if (sQuote || dQuote) {
            // In the middle of a quote, do nothing
            break;
          }
          parenDepth++;

          break;
        case ")":
          if (sQuote || dQuote) {
            // In the middle of a quote, do nothing
            break;
          }
          parenDepth--;

          if (parenDepth == 0) {
            // Found end of parenthetical
            tokenClose.push({
              start: 0,
              end: index + 1,
              offset: 0,
              recurse: true,
            });
          }

          break;
        case "<":
        case ">":
          // numerical operators

          if (sQuote || dQuote || parenDepth > 0) {
            break;
          }

          // Look ahead to see if '<=' or '>='
          if (str[index + 1] == "=") {
            // it is
            if (index > 0) {
              // push previous token
              // start = 0
              // current - 1
              tokenClose.push({ start: 0, end: 2, offset: 2, recurse: false });
              tokenClose.push({
                start: 0,
                end: index,
                offset: -1,
                recurse: false,
              });
            } else {
              // At start of string due to quote
              tokenClose.push({ start: 0, end: 2, offset: 1, recurse: false });
            }
          } else {
            if (index > 0) {
              // push previous token
              // start = 0
              // current - 1
              tokenClose.push({ start: 0, end: 1, offset: 1, recurse: false });
              tokenClose.push({
                start: 0,
                end: index,
                offset: -1,
                recurse: false,
              });
            } else {
              // At start of string due to quote
              tokenClose.push({ start: 0, end: 1, offset: 0, recurse: false });
            }
          }

          break;
        case "=":
        case ":":
          // Encountered a : or = operator
          if (sQuote || dQuote || parenDepth > 0) {
            break;
          }

          if (index + 1 == length) {
            // Encountered ':' at end of string
            ui.notifications.error("Invalid input - Cannot end with ':'");
            throw "Invalid input - Cannot end with ':'";
          } else if (index == 0 && tokens.length == 0) {
            // Start of token or string is ':'
            ui.notifications.error("Invalid input - Cannot start with ':'");
            throw "Invalid input - Cannot start with ':'";
          }

          if (index > 0) {
            // push previous token
            // start = 0
            // current - 1
            tokenClose.push({ start: 0, end: 1, offset: 1, recurse: false });
            tokenClose.push({
              start: 0,
              end: index,
              offset: -1,
              recurse: false,
            });
          } else {
            // At start of string
            tokenClose.push({ start: 0, end: 1, offset: 0, recurse: false });
          }
          // push :
          // start = index - 1
          // end = index;

          break;
        case " ":
          // Encountered white space
          if (sQuote || dQuote || parenDepth > 0) {
            break;
          }
          // push token
          // start = 0
          // end = index - 1
          tokenClose.push({ start: 0, end: index, offset: 0, recurse: false });

          break;
        default:
          break;
      }

      index++;
      if (index > 0 && index == length && tokenClose.length == 0) {
        // Final token push
        // start = 0
        // end = index

        tokenClose.push({ start: 0, end: index, offset: 0, recurse: false });
      }

      while (tokenClose.length > 0) {
        const close = tokenClose.pop();
        //tokens.push(str.substring(close.start, close.end));
        const token = str.substring(close.start, close.end);
        if (close.recurse) {
          tokens.push(
            TagItSearch.tokenizer(token.substring(1, token.length - 1))
          );
        } else {
          tokens.push(token);
        }
        //tokens.push(str.substring(close.start, close.end));
        str = str.substring(index + close.offset).trim();
        index = 0;
        length = str.length;
      }
    }

    if (sQuote) {
      ui.notifications.error(`Invalid input - Unclosed quote (')`);
      throw `Invalid input - Unclosed quote (')`;
    } else if (dQuote) {
      ui.notifications.error(`Invalid input - Unclosed quote (")`);
      throw `Invalid input - Unclosed quote (")`;
    } else if (parenDepth < 0) {
      ui.notifications.error(`Invalid input - Too many ')'`);
      throw `Invalid input - Too many ')'`;
    } else if (parenDepth > 0) {
      ui.notifications.error(`Invalid input - Unclosed '('`);
      throw `Invalid input - Unclosed '('`;
    }

    return tokens;
  }

  static reservedTokens = [
    "n",
    "name",
    "t",
    "type",
    "document-type",
    "tag",
    "meta",
    "m",
  ];

  static async parser(tokens) {
    let expressions = [];

    let merge = null;

    const operators = [":", "=", "<", "<=", ">", ">="];
    const boolOperators = ["&&", "||"];

    const tokenMap = function (document) {
      return {
        id: document.id,
        name: document.name,
        documentName: document.documentName,
        tags: [
          ...new Set(
            [].concat(
              document.flags?.tagit?.tags,
              document.actor?.data?.flags?.tagit?.tags
            )
          ),
        ]
          .filter((item) => item !== undefined)
          .sort(tagsort()),
        document: document,
        img: document.img,
      };
    };

    while (tokens.length) {
      const item = tokens.shift();

      let expression = null;
      let filter = null;
      let tokenFilter = null;

      if (Array.isArray(item)) {
        // Recurse
        expressions.push(await TagItSearch.parser(item));
      } else if (operators.includes(tokens[0])) {
        // Next token is an operator
        let op = tokens.shift();
        const value = tokens.shift();
        switch (item) {
          case "n":
          case "name":
            // Looking for a name
            filter = function (document) {
              return document.name.toLowerCase().includes(value.toLowerCase());
            };

            tokenFilter = filter;

            expression = {
              op: "filter",
            };
            break;
          case "t":
          case "type":
          case "document-type":
            // Filtering an entity
            let doc = value.toLowerCase();

            switch (doc) {
              case "journal":
              case "j":
                doc = "journalentry";
                break;
              case "a":
                doc = "actor";
                break;
              case "i":
                doc = "item";
                break;
              case "s":
                doc = "scene";
                break;
              case "t":
                doc = "token";
                break;
              case "compendium":
              case "pack":
              case "c":
                doc = "compendium";
                break;
            }

            expression = {
              op: "doc-filter",
            };

            if (doc === "compendium") {
              filter = function (document) {
                return document.compendium;
              };

              tokenFilter = filter;
            } else {
              filter = function (document) {
                return document.documentName.toLowerCase() == doc;
              };

              tokenFilter = filter;
            }

            break;
          case "tag":
            // Looking for a tag

            filter = function (document) {
              return document.tags.some(
                (tag) => tag.tag.toLowerCase() === value.toLowerCase()
              );
            };

            tokenFilter = function (document) {
              return (
                document.flags?.tagit?.tags?.some(
                  (tag) => tag.tag.toLowerCase() === value.toLowerCase()
                ) ||
                document.actor?.data?.flags?.tagit?.tags?.some(
                  (tag) => tag.tag.toLowerCase() === value.toLowerCase()
                )
              );
            };

            expression = {
              op: "filter",
            };
            break;
          case "meta":
          case "m":
            filter = function (document) {
              return document.tags.some(
                (tag) =>
                  tag.meta && tag.meta.toLowerCase() === value.toLowerCase()
              );
            };

            tokenFilter = function (document) {
              return (
                document.flags?.tagit?.tags?.some(
                  (tag) =>
                    tag.meta && tag.meta.toLowerCase() === value.toLowerCase()
                ) ||
                document.actor?.data?.flags?.tagit?.tags?.some(
                  (tag) =>
                    tag.meta && tag.meta.toLowerCase() === value.toLowerCase()
                )
              );
            };

            expression = {
              op: "filter",
            };
            break;
          default:
            // Tag with value

            const numValue = parseInt(value);
            let valueExpr = null;

            if (isNaN(numValue)) {
              // Meta
              valueExpr = function (tag) {
                return (
                  tag.tag.toLowerCase() === value.toLowerCase() &&
                  tag.meta?.toLowerCase() === item.toLowerCase()
                );
              };
            } else {
              // Number value
              switch (op) {
                case ":":
                case "=":
                  valueExpr = function (tag) {
                    return (
                      tag.tag.toLowerCase() === item.toLowerCase() &&
                      tag.value == value
                    );
                  };
                  break;
                case ">":
                  valueExpr = function (tag) {
                    return (
                      tag.tag.toLowerCase() === item.toLowerCase() &&
                      tag.value > value
                    );
                  };
                  break;
                case ">=":
                  valueExpr = function (tag) {
                    return (
                      tag.tag.toLowerCase() === item.toLowerCase() &&
                      tag.value >= value
                    );
                  };
                  break;
                case "<":
                  valueExpr = function (tag) {
                    return (
                      tag.tag.toLowerCase() === item.toLowerCase() &&
                      tag.value < value
                    );
                  };
                  break;
                case "<=":
                  valueExpr = function (tag) {
                    return (
                      tag.tag.toLowerCase() === item.toLowerCase() &&
                      tag.value <= value
                    );
                  };
                  break;
              }
            }

            filter = function (document) {
              return document.tags.some((tag) => valueExpr(tag));
            };

            tokenFilter = function (document) {
              return (
                document.flags?.tagit?.tags?.some((tag) =>
                  valueExpr(tag)
                ) ||
                document.actor?.data?.flags?.tagit?.tags?.some((tag) =>
                  valueExpr(tag)
                )
              );
            };

            expression = {
              op: "filter",
            };

            break;
        }
      } else {
        // No operator
        tokens.unshift(["name", ":", item, "||", "tag", ":", item]);

        continue;

        // filter = function(document) {
        //     return document.tags.some(tag => tag.tag.toLowerCase() === item.toLowerCase());
        // }

        // tokenFilter = function(document) {
        //     return document.flags?.tagit?.tags?.some(tag => tag.tag.toLowerCase() === item.toLowerCase()) ||
        //     document.actor?.data?.flags?.tagit?.tags?.some(tag => tag.tag.toLowerCase() === item.toLowerCase());
        // }

        // expression = {
        //     op: "filter"
        // }
      }

      if (expression && filter) {
        expression.document = function (collection) {
          return collection.filter((document) => filter(document));
        };

        expression.token = function (collection) {
          return collection
            .filter((document) => !document.isLinked && tokenFilter(document))
            .map((token) => tokenMap(token));
        };
      }

      if (expression) {
        // Have a filter expression

        expressions.push(expression);
        expression = null;
      }

      if (merge) {
        expressions.push(merge);
        merge = null;
      }

      if (tokens.length > 0 && boolOperators.includes(tokens[0])) {
        // Next operand is a bool operator
        switch (tokens.shift()) {
          case "&&":
            merge = {
              op: "merge",
              func: function (a, b) {
                return a.filter((A) =>
                  b.some(
                    (B) =>
                      A.id === B.id && A.name === B.name && A.type === B.type
                  )
                );
              },
            };
            break;
          case "||":
            merge = {
              op: "merge",
              func: function (a, b) {
                return [...a, ...b].filter(
                  (A, pos, arr) =>
                    arr.findIndex(
                      (B) =>
                        A.id === B.id && A.name === B.name && A.type === B.type
                    ) == pos
                );
              },
            };
            break;
        }
      } else if (tokens.length > 0) {
        // Next operator is not a bool operator
        // Assume &&
        merge = {
          op: "merge",
          func: function (a, b) {
            return a.filter((A) => b.some((B) => A.id === B.id));
          },
        };
      }
    }

    return expressions;
  }

  static exec(et) {
    let a = null;
    let b = null;
    let x = null;

    while (et.length > 0) {
      const expression = et.shift();

      if (Array.isArray(expression)) {
        // Parentheticals
        x = TagItSearch.exec(expression);
      } else {
        x = [];
        switch (expression.op) {
          case "filter":
          case "doc-filter":
            x.push(...expression.document(TagItIndex.Index));
            x.push(...expression.token(canvas.tokens.getDocuments()));

            break;
          case "merge":
            a = expression.func(a, b);
            break;
        }
      }

      if (a) {
        b = x;
      } else {
        a = x;
      }
    }

    return a;
  }

  static async find(predicate) {
    const promise = new Promise(async function (resolve, reject) {
      try {
        const results = TagItIndex.Index.find(predicate);
        resolve(results);
      } catch (e) {
        reject(e);
      }
    });

    return promise;
  }

  static async search(item, options) {
    const defaults = {
      limit: 20,
    };
    options = $.extend({}, defaults, options || {});

    let promise = null;

    if (item instanceof Function) {
      promise = new Promise(async function (resolve, reject) {
        try {
          let results = TagItIndex.Index.filter(item).sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          if (options.limit > 0) {
            results = results.slice(0, options.limit);
          }

          resolve(results);
        } catch (e) {
          reject(e);
        }
      });
    } else {
      promise = new Promise(async function (resolve, reject) {
        try {
          const tokens = TagItSearch.tokenizer(item);
          const instructions = await TagItSearch.parser(tokens);
          let results = TagItSearch.exec(instructions).sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          if (options.limit > 0) {
            results = results.slice(0, options.limit);
          }

          resolve(results);
        } catch (e) {
          reject(e);
        }
      });
    }

    return promise;
  }
}

let form = null;

Hooks.once("init", function () {
  const partials = [
    `modules/${mod}/templates/input-partial.html`,
    `modules/${mod}/templates/search-options.html`,
  ];

  console.log(loadTemplates(partials));
});

Hooks.once("ready", async () => {
  window.addEventListener("keypress", (e) => {
    if (e.shiftKey && e.ctrlKey && e.code === "KeyF") {
      if (form === null) {
        form = new TagItSearch();
      }

      if (!form.rendered) {
        form.render(true);
      }
    }
  });
});
