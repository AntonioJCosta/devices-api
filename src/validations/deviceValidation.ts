import { z } from "zod"
const deviceStateEnum = z.enum(["available", "in-use", "inactive"])

const baseDeviceSchema = z.object({
  name: z.string().min(5, "Name is required"),
  brand: z.string().min(5, "Brand is required"),
  state: deviceStateEnum,
})

export const createDeviceSchema = baseDeviceSchema

// Schema for updating an existing device (all fields optional)
export const updateDeviceSchema = baseDeviceSchema.partial().superRefine((data, ctx) => {
  // This refinement needs the current state of the device from the database
  // We'll handle the logic for 'name' and 'brand' updates based on 'state' in the service/controller layer
  // where we have access to the existing device data.
  // Similarly, deletion restriction for 'in-use' devices will be handled there.
  // Creation time update prevention is implicit as it's not part of the update schema.
})

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>