import { describe, expect, it } from "vitest";
import { mapCondition, nepaliSummary } from "../src/services/weather";
import { nearestWeatherCity } from "@hamronepal/shared";

describe("weather conditions", () => {
  it("tells partly cloudy from overcast, and storms from rain", () => {
    expect(mapCondition(800)).toBe("sunny");
    expect(mapCondition(801)).toBe("partly-cloudy");
    expect(mapCondition(802)).toBe("partly-cloudy");
    expect(mapCondition(803)).toBe("cloudy");
    expect(mapCondition(804)).toBe("cloudy");
    expect(mapCondition(211)).toBe("stormy");
    expect(mapCondition(500)).toBe("rainy");
    expect(mapCondition(721)).toBe("foggy");
  });

  it("names the condition in Nepali", () => {
    expect(nepaliSummary(800)).toBe("सफा आकाश");
    expect(nepaliSummary(802)).toBe("आंशिक बादल");
    expect(nepaliSummary(804)).toBe("पूर्ण बादल");
    expect(nepaliSummary(721)).toBe("धुम्मिएको");
  });

  it("finds the nearest listed city for 'my location'", () => {
    expect(nearestWeatherCity(27.59, 85.52).slug).toBe("panauti");
    expect(nearestWeatherCity(28.21, 83.99).slug).toBe("pokhara");
  });
});
