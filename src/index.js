import { createPortal } from "react-dom";
import React, {
  useRef,
  useEffect,
  forwardRef,
  useMemo,
  useCallback,
  isValidElement,
  cloneElement,
} from "react";

function ElementPopper(
  {
    element,
    popper,
    position = "bottom-center",
    containerStyle,
    containerClassName = "",
    arrow,
    arrowStyle = {},
    arrowClassName = "",
    fixMainPosition,
    fixRelativePosition,
    offsetY,
    offsetX,
    animations,
    zIndex = 0,
    popperShadow,
    onChange,
    active = true,
    portal,
    portalTarget,
  },
  outerRef
) {
  const isBrowser = typeof window !== "undefined",
    isValidPortalTarget = isBrowser && portalTarget instanceof HTMLElement,
    defaultArrow = arrow === true,
    isPopper = popper && active === true,
    elementRef = useRef(),
    popperRef = useRef(),
    arrowRef = useRef(),
    div = useRef(),
    options = useMemo(
      () => ({
        position,
        fixMainPosition,
        fixRelativePosition,
        offsetY,
        offsetX,
        defaultArrow,
        animations,
        zIndex,
        onChange,
      }),
      [
        position,
        fixMainPosition,
        fixRelativePosition,
        offsetY,
        offsetX,
        defaultArrow,
        animations,
        onChange,
        zIndex,
      ]
    ),
    removeTransition = useCallback(() => {
      if (arrowRef.current) arrowRef.current.style.transition = "";
      if (popperRef.current) popperRef.current.parentNode.style.transition = "";
    }, []),
    styles = {
      element: {
        display: "inline-block",
        height: "max-content",
        ...containerStyle,
      },
      arrow: {
        visibility: "hidden",
        left: "0",
        top: "0",
        position: "absolute",
        ...arrowStyle,
      },
      popper: {
        position: "absolute",
        left: "0",
        top: "0",
        willChange: "transform",
        visibility: "hidden",
        zIndex,
      },
    };

  if (isBrowser && !div.current) {
    div.current = document.createElement("div");
    /**
     * This data will be used only in very rare cases
     * in which the user wants to toggle the portal without closing the popper.
     */
    div.current.data = { portal, isValidPortalTarget };
  }

  useEffect(() => {
    if (!portal || isValidPortalTarget) return;

    const portalDiv = div.current;

    document.body.appendChild(portalDiv);

    return () => document.body.removeChild(portalDiv);
  }, [portal, isValidPortalTarget]);

  useEffect(() => {
    if (!isPopper) {
      removeTransition();

      if (popperRef.current)
        popperRef.current.parentNode.style.visibility = "hidden";

      if (arrowRef.current) arrowRef.current.style.visibility = "hidden";

      return;
    }

    updatePosition();

    function updatePosition(e) {
      if (e && e.type !== "resize" && !e.target.contains(elementRef.current))
        return;
      if (e) removeTransition();

      setPosition(elementRef, popperRef, arrowRef, options, e);
    }

    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isPopper, options, removeTransition]);

  useEffect(() => {
    let data = { portal, isValidPortalTarget };
    let prevData = div.current.data;

    if (JSON.stringify(data) === JSON.stringify(prevData)) return;
    /**
     * If the user wants to implement a layout in which
     * the portal value is toggling without closing the popper,
     * the above condition will break and the popper position will be refresh.
     */
    div.current.data = data;
    elementRef.current.refreshPosition();
  }, [portal, isValidPortalTarget]);

  const node = (
    <>
      <RenderArrow />
      <RenderPopper />
    </>
  );

  return (
    <div ref={setRef} className={containerClassName} style={styles.element}>
      {element}
      {portal && isBrowser
        ? createPortal(node, isValidPortalTarget ? portalTarget : div.current)
        : node}
    </div>
  );

  function setRef(element) {
    if (element) {
      element.removeTransition = removeTransition;
      element.refreshPosition = () =>
        setTimeout(
          () =>
            setPosition(
              elementRef,
              popperRef,
              arrowRef,
              options,
              {} //To prevent animation
            ),
          10
        );
    }

    elementRef.current = element;

    if (outerRef instanceof Function) return outerRef(element);
    if (outerRef) outerRef.current = element;
  }

  function RenderArrow() {
    if (!arrow || !isPopper) return null;

    let div = <div ref={arrowRef} style={styles.arrow} />;
    let props = isValidElement(arrow)
      ? { children: arrow }
      : {
          className: `ep-arrow ${
            popperShadow ? "ep-shadow" : ""
          } ${arrowClassName}`,
        };

    return cloneElement(div, props);
  }

  function RenderPopper() {
    return (
      <div
        className={popperShadow ? "ep-popper-shadow" : ""}
        style={styles.popper}
      >
        <div ref={popperRef}>{popper}</div>
      </div>
    );
  }
}

export default forwardRef(ElementPopper);

function setPosition(
  elementRef,
  popperRef,
  arrowRef,
  {
    position,
    fixMainPosition,
    fixRelativePosition,
    offsetY = 0,
    offsetX = 0,
    defaultArrow,
    animations = [],
    zIndex,
    onChange,
  },
  e
) {
  if (!elementRef.current || !popperRef.current) return;

  let { scrollLeft, scrollTop } = getScroll(),
    {
      top: elementTop,
      left: elementLeft,
      height: elementHeight,
      width: elementWidth,
      right: elementRight,
      bottom: elementBottom,
    } = getPosition(elementRef.current, scrollLeft, scrollTop),
    {
      top: popperTop,
      left: popperLeft,
      height: popperHeight,
      width: popperWidth,
    } = getPosition(popperRef.current, scrollLeft, scrollTop),
    { clientHeight, clientWidth } = document.documentElement,
    popperContainer = popperRef.current.parentNode,
    [translateX, translateY] = getTranslate(popperContainer),
    [mainPosition, relativePosition, vertical, horizontal] =
      splitPosition(position),
    currentMainPosition = mainPosition,
    getTransform = (x, y) => `translate(${x}px, ${y}px)`,
    lengthDifference = elementWidth - popperWidth,
    heightDifference = elementHeight - popperHeight,
    leftCorner =
      relativePosition === "left"
        ? 0
        : relativePosition === "right"
        ? lengthDifference
        : lengthDifference / 2,
    rightCorner = lengthDifference - leftCorner,
    topCorner =
      relativePosition === "top"
        ? 0
        : relativePosition === "bottom"
        ? heightDifference
        : heightDifference / 2,
    bottomCorner = heightDifference - topCorner,
    x = elementLeft - popperLeft + translateX,
    y = elementTop - popperTop + translateY,
    distanceX = 0,
    distanceY = 0,
    scrollableParent = getScrollableParent(elementRef.current),
    scrollableParents = [],
    parentPosition,
    arrow = arrowRef.current,
    { height: arrowHeight = 0, width: arrowWidth = 0 } =
      getPosition(arrow, scrollLeft, scrollTop) || {},
    arrowX = x,
    arrowY = y,
    arrowDirection,
    mirror = { top: "bottom", bottom: "top", left: "right", right: "left" };

  if (vertical) {
    x += leftCorner;
    y += mainPosition === "top" ? -popperHeight : elementHeight;

    if (defaultArrow) {
      arrowHeight = 11;
      arrowWidth = 20;
    }
  }

  if (horizontal) {
    x += mainPosition === "left" ? -popperWidth : elementWidth;
    y += topCorner;

    if (defaultArrow) {
      arrowHeight = 20;
      arrowWidth = 11;
    }
  }

  while (scrollableParent) {
    scrollableParents.push(scrollableParent);
    parentPosition = getPosition(scrollableParent, scrollLeft, scrollTop);
    checkPopper(parentPosition);
    scrollableParent = getScrollableParent(scrollableParent.parentNode);
  }

  //checking the visible document
  checkPopper({
    top: scrollTop,
    bottom: scrollTop + clientHeight,
    left: scrollLeft,
    right: scrollLeft + clientWidth,
    height: clientHeight,
    width: clientWidth,
  });

  function checkPopper({ top, bottom, left, right, height, width }) {
    if (vertical) {
      let elementCenterY = Math.round(elementTop - top + elementHeight / 2),
        parentCenterY = Math.round(height / 2);

      if (!fixMainPosition) {
        if (
          elementTop - (popperHeight + offsetY + arrowHeight) < top &&
          elementCenterY <= parentCenterY &&
          currentMainPosition === "top"
        ) {
          y += popperHeight + elementHeight;

          currentMainPosition = "bottom";
        } else if (
          elementBottom + popperHeight + offsetY + arrowHeight > height + top &&
          elementCenterY >= parentCenterY &&
          currentMainPosition === "bottom"
        ) {
          y -= popperHeight + elementHeight;

          currentMainPosition = "top";
        }
      }

      if (!fixRelativePosition) {
        if (elementLeft + leftCorner < left) {
          distanceX = getMaxDistance(
            elementRight - arrowWidth > left
              ? elementLeft + leftCorner - left
              : -elementWidth + leftCorner + arrowWidth,
            distanceX
          );
        }

        if (elementRight - rightCorner > right) {
          distanceX = getMaxDistance(
            elementLeft + arrowWidth < right
              ? elementRight - rightCorner - right
              : elementWidth - rightCorner - arrowWidth,
            distanceX
          );
        }
      }
    }

    if (horizontal) {
      let elementCenterX = Math.round(elementLeft - left + elementWidth / 2),
        parentCenterX = Math.round(width / 2);

      if (!fixMainPosition) {
        if (
          elementLeft - (popperWidth + offsetX + arrowWidth) < left &&
          elementCenterX < parentCenterX &&
          currentMainPosition === "left"
        ) {
          x += elementWidth + popperWidth;

          currentMainPosition = "right";
        } else if (
          elementRight + popperWidth + offsetX + arrowWidth > right &&
          elementCenterX > parentCenterX &&
          currentMainPosition === "right"
        ) {
          x -= elementWidth + popperWidth;

          currentMainPosition = "left";
        }
      }

      if (!fixRelativePosition) {
        if (elementTop + topCorner < top) {
          distanceY = getMaxDistance(
            elementBottom - arrowHeight > top
              ? elementTop + topCorner - top
              : -elementHeight + topCorner + arrowHeight,
            distanceY
          );
        }

        if (elementBottom - bottomCorner > bottom) {
          distanceY = getMaxDistance(
            elementTop + arrowHeight < bottom
              ? elementBottom - bottomCorner - bottom
              : elementHeight - bottomCorner - arrowHeight,
            distanceY
          );
        }
      }
    }
  }

  if (vertical) y += currentMainPosition === "bottom" ? offsetY : -offsetY;
  if (horizontal) x += currentMainPosition === "right" ? offsetX : -offsetX;

  x = x - distanceX;
  y = y - distanceY;

  arrowDirection = mirror[currentMainPosition];

  if (arrow) {
    let isElementSmaller;

    if (vertical) {
      isElementSmaller = elementWidth < popperWidth;

      if (isElementSmaller) {
        arrowX += elementWidth / 2;
      } else {
        arrowX = x + popperWidth / 2;
      }

      arrowX -= arrowWidth / 2;

      if (currentMainPosition === "bottom") {
        arrowY = y;
        y += arrowHeight;
      }

      if (currentMainPosition === "top") {
        y -= arrowHeight;
        arrowY = y + popperHeight;
      }

      if (distanceX < 0 && distanceX - leftCorner < 0) {
        if (isElementSmaller) {
          arrowX += (leftCorner - distanceX) / 2;
        } else if (elementWidth - leftCorner + distanceX < popperWidth) {
          arrowX += (elementWidth - leftCorner + distanceX - popperWidth) / 2;
        }
      }

      if (distanceX > 0 && distanceX + rightCorner > 0) {
        if (isElementSmaller) {
          arrowX -= (distanceX + rightCorner) / 2;
        } else if (elementWidth - distanceX - rightCorner < popperWidth) {
          arrowX -= (elementWidth - distanceX - rightCorner - popperWidth) / 2;
        }
      }
    }

    if (horizontal) {
      isElementSmaller = elementHeight < popperHeight;

      if (isElementSmaller) {
        arrowY += elementHeight / 2;
      } else {
        arrowY = y + popperHeight / 2;
      }

      arrowY -= arrowHeight / 2;

      if (currentMainPosition === "left") {
        x -= arrowWidth;
        arrowX = x + popperWidth;
      }

      if (currentMainPosition === "right") {
        arrowX = x;
        x += arrowWidth;
      }

      if (distanceY < 0 && distanceY - topCorner < 0) {
        if (isElementSmaller) {
          arrowY += (topCorner - distanceY) / 2;
        } else if (elementHeight - topCorner + distanceY < popperHeight) {
          arrowY += (elementHeight - topCorner + distanceY - popperHeight) / 2;
        }
      }

      if (distanceY > 0 && distanceY + bottomCorner > 0) {
        if (isElementSmaller) {
          arrowY -= (distanceY + bottomCorner) / 2;
        } else if (elementHeight - distanceY - bottomCorner < popperHeight) {
          arrowY -=
            (elementHeight - distanceY - bottomCorner - popperHeight) / 2;
        }
      }
    }

    arrow.setAttribute("direction", arrowDirection);
    arrow.style.height = arrowHeight + "px";
    arrow.style.width = arrowWidth + "px";
    arrow.style.transform = getTransform(arrowX, arrowY);
    arrow.style.visibility = "visible";
    arrow.style.zIndex = zIndex + 1;
  }

  popperContainer.style.transform = getTransform(x, y);

  let data = {
    popper: {
      top: y,
      bottom: y + popperHeight,
      left: x,
      right: x + popperWidth,
      height: popperHeight,
      width: popperWidth,
    },
    element: {
      top: elementTop,
      bottom: elementBottom,
      left: elementLeft,
      right: elementRight,
      height: elementHeight,
      width: elementWidth,
    },
    arrow: {
      top: arrowY,
      bottom: arrowY + arrowHeight,
      left: arrowX,
      right: arrowX + arrowWidth,
      height: arrowHeight,
      width: arrowWidth,
      direction: arrowDirection,
    },
    position:
      currentMainPosition + "-" + (distanceX !== 0 ? "auto" : relativePosition),
    scroll: { scrollLeft, scrollTop },
    scrollableParents,
    event: e,
  };

  if (!e) {
    animations.forEach((animation) => {
      animation({
        popper: popperContainer,
        arrow,
        data: { ...data, getTransform, mirror },
      });
    });
  }

  popperContainer.style.visibility = "visible";

  if (typeof onChange === "function") onChange(data);
}

function getScroll() {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY#notes
   */

  let supportPageOffset = window.pageXOffset !== undefined,
    isCSS1Compat = (document.compatMode || "") === "CSS1Compat";

  return {
    scrollLeft: supportPageOffset
      ? window.pageXOffset
      : isCSS1Compat
      ? document.documentElement.scrollLeft
      : document.body.scrollLeft,
    scrollTop: supportPageOffset
      ? window.pageYOffset
      : isCSS1Compat
      ? document.documentElement.scrollTop
      : document.body.scrollTop,
  };
}

function getPosition(element, scrollLeft, scrollTop) {
  if (!element) return;

  let { top, left, width, height } = element.getBoundingClientRect(),
    elementTop = top + scrollTop,
    elementLeft = left + scrollLeft;

  return {
    top: elementTop,
    bottom: elementTop + height,
    left: elementLeft,
    right: elementLeft + width,
    width,
    height,
  };
}

function getTranslate(element) {
  if (!element) return [0, 0];

  let [, x = 0, y = 0] = (
    element.style.transform.match(/translate\((.*?)px,\s(.*?)px\)/) || []
  ).map((string) => Number(string));

  return [x, y];
}

function getScrollableParent(element) {
  if (!element || element.tagName === "HTML") return;

  let style = window.getComputedStyle(element),
    isScrollable = (string) => ["auto", "scroll"].includes(string);

  if (
    (element.clientHeight < element.scrollHeight &&
      isScrollable(style.overflowX)) ||
    (element.clientWidth < element.scrollWidth && isScrollable(style.overflowY))
  )
    return element;

  return getScrollableParent(element.parentNode);
}

function splitPosition(position) {
  let [mainPosition = "bottom", relativePosition = "center"] =
    position.split("-");

  if (mainPosition === "auto") mainPosition = "bottom";
  if (relativePosition === "auto") relativePosition = "center";

  let vertical = mainPosition === "top" || mainPosition === "bottom",
    horizontal = mainPosition === "left" || mainPosition === "right";

  if (horizontal) {
    if (relativePosition === "start") relativePosition = "top";
    if (relativePosition === "end") relativePosition = "bottom";
  }

  if (vertical) {
    if (relativePosition === "start") relativePosition = "left";
    if (relativePosition === "end") relativePosition = "right";
  }

  return [mainPosition, relativePosition, vertical, horizontal];
}

function getMaxDistance(currentDistance, previousDistance) {
  if (
    Math.round(Math.abs(currentDistance)) >
    Math.round(Math.abs(previousDistance))
  ) {
    return currentDistance;
  }

  return previousDistance;
}
