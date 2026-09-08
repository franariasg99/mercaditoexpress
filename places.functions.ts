import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const searchAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(3).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { suggestAddresses } = await import("./places.server");
    return suggestAddresses(data.query);
  });

export const getPlaceDetails = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ place_id: z.string().trim().min(3).max(800) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { placeDetails } = await import("./places.server");
    return placeDetails(data.place_id);
  });