import React, { useRef, useEffect } from "react";
import { View, Animated, Dimensions, StyleSheet, Easing } from "react-native";

const SQUARE_COLORS = ["#74933c", "#248bbc", "#1f3d7c", "#4c6c7c", "#1c6c7c"];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_SIZE = 20;
const MAX_SIZE = 60;

export function RainingSquares({ squareCount = 30 }) {
  const squares = useRef(
    Array.from({ length: squareCount }, () => ({
      y: new Animated.Value(-100),
      x: new Animated.Value(0),
      rotate: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      opacity: new Animated.Value(0),
      size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
    }))
  ).current;

  useEffect(() => {
    squares.forEach((square) => {
      const startX = Math.random() * SCREEN_WIDTH * 1.5 - SCREEN_WIDTH * 0.25;
      const endX = startX + (Math.random() * 200 - 100);
      
      // Horizontal animation
      Animated.loop(
        Animated.timing(square.x, {
          toValue: endX,
          duration: 8000 + Math.random() * 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();

      // Vertical animation with multiple effects
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(square.y, {
              toValue: SCREEN_HEIGHT + 200,
              duration: 10000 + Math.random() * 5000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(square.rotate, {
              toValue: 1,
              duration: 5000 + Math.random() * 3000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(square.opacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(square.opacity, {
                toValue: 0.3,
                duration: 8000,
                useNativeDriver: true,
              }),
            ]),
            Animated.spring(square.scale, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(square.y, {
            toValue: -200,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <>
      {squares.map((square, index) => {
        const rotate = square.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${Math.random() > 0.5 ? 360 : -360}deg`],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.square,
              {
                backgroundColor: SQUARE_COLORS[index % SQUARE_COLORS.length],
                width: square.size,
                height: square.size,
                opacity: square.opacity,
                transform: [
                  { translateX: square.x },
                  { translateY: square.y },
                  { rotate },
                  { scale: square.scale },
                ],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  square: {
    position: "absolute",
    borderRadius: 8,
    opacity: 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});