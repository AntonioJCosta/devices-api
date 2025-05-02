import logger from '../config/logger'
import { deviceService } from '../services/deviceService'
import { createDeviceSchema, updateDeviceSchema, fullUpdateDeviceSchema } from '../validations/deviceValidation'
import type { Context } from 'elysia'

/**
 * Controller handling CRUD operations for devices.
 */
export const deviceController = {
  /**
   * Handles the creation of a new device.
   * Validates the request body against the createDeviceSchema.
   * @param ctx - The Elysia context object, expecting the device data in the body.
   * @returns The newly created device object with status 201, or an error response.
   */
  async create(ctx: Context) {
    try {
      const validationResult = createDeviceSchema.safeParse(ctx.body)

      if (!validationResult.success) {
        ctx.set.status = 400
        logger.warn({ validationErrors: validationResult.error.format(), body: ctx.body }, "Device creation validation failed");
        return { error: 'Invalid input data', details: validationResult.error.format() }
      }

      const newDevice = await deviceService.createDevice(validationResult.data)
      ctx.set.status = 201
      return newDevice
    } catch (error: any) {
      // Handle potential duplicate name errors from the service/repository layer
      if (error.message?.includes("already exists")) {
        ctx.set.status = 409; // Conflict
        logger.warn({ err: error, body: ctx.body }, "Attempted to create device with duplicate name");
        return { error: error.message };
      }

      logger.error({ err: error, body: ctx.body }, "Unexpected error creating device");
      ctx.set.status = 500
      return { error: 'Failed to create device' }
    }
  },

  /**
   * Handles fetching all devices, optionally filtering by brand and/or state.
   * @param ctx - The Elysia context object, potentially containing query parameters for filtering.
   * @returns An array of device objects, or an error response.
   */
  async getAll(ctx: Context<{ query: { brand?: string; state?: string } }>) {
    try {
      return await deviceService.getAllDevices(ctx.query);
    } catch (error) {
      logger.error({ err: error, query: ctx.query }, "Error fetching all devices");
      ctx.set.status = 500
      return { error: 'Failed to fetch devices' }
    }
  },

  /**
   * Handles fetching a single device by its ID.
   * @param ctx - The Elysia context object, expecting the device ID as a URL parameter.
   * @returns The requested device object, or a 404/400/500 error response.
   */
  async getById(ctx: Context<{ params: { id: number } }>) {
    try {
      const {id} = ctx.params

      const device = await deviceService.getDeviceById(id)
      if (!device) {
        ctx.set.status = 404
        return { error: 'Device not found' }
      }
      return device
    } catch (error: any) {
      let errorMessage = 'Failed to fetch device';
      if (error instanceof Error) {
          errorMessage = error.message; 
      }
      logger.error({ err: error, params: ctx.params }, "Error fetching device by ID");
      ctx.set.status = 500
      return { error: errorMessage }
    }
  },


  /**
   * Handles partially updating an existing device by its ID (PATCH).
   * Validates the request body against the updateDeviceSchema (fields are optional).
   * @param ctx - The Elysia context object, expecting ID in params and partial update data in body.
   * @returns The updated device object, or an error response (400, 404, 409, 500).
   */
  async update(ctx: Context<{ params: { id: string }}>) {
    let id: number | undefined;
    try {
      id = parseInt(ctx.params.id, 10)
      if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID format' }
      }

      const validationResult = updateDeviceSchema.safeParse(ctx.body)

      if (!validationResult.success) {
        ctx.set.status = 400
        logger.warn({ deviceId: id, validationErrors: validationResult.error.format(), body: ctx.body }, "Device partial update validation failed");
        return { error: 'Invalid input data', details: validationResult.error.format() }
      }

      const validatedData = validationResult.data

      if (Object.keys(validatedData).length === 0) {
        ctx.set.status = 400;
        return { error: 'Update payload cannot be empty' };
      }

      const updatedDevice = await deviceService.updateDevice(id, validatedData)
      if (!updatedDevice) {
        ctx.set.status = 404
        return { error: 'Device not found' }
      }
      return updatedDevice
    } catch (error: any) {
      if (error.message === 'Device not found') {
        ctx.set.status = 404;
        logger.warn({ deviceId: id, err: error.message }, "Device not found during delete attempt");
        return { error: 'Device not found' };
      }
      if (error.message?.includes("Cannot update") || error.message?.includes("already exists")) {
        const statusCode = error.message.includes("already exists") ? 409 : 400;
        ctx.set.status = statusCode;
        logger.warn({ deviceId: id, body: ctx.body, err: error.message }, "Domain validation failed during partial update");
        return { error: error.message };
      }
      logger.error({ err: error, deviceId: id, body: ctx.body }, "Unexpected error partially updating device");
      ctx.set.status = 500
      return { error: 'Failed to update device' }
    }
  },

  /**
   * Handles fully updating (replacing) an existing device by its ID (PUT).
   * Validates the request body against the fullUpdateDeviceSchema (all fields required).
   * @param ctx - The Elysia context object, expecting ID in params and full device data in body.
   * @returns The updated device object, or an error response (400, 404, 409, 500).
   */
  async updateFull(ctx: Context<{ params: { id: string }}>) {
    let id: number | undefined;
    try {
      id = parseInt(ctx.params.id, 10)
      if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID format' }
      }

      const validationResult = fullUpdateDeviceSchema.safeParse(ctx.body)

      if (!validationResult.success) {
        ctx.set.status = 400
        logger.warn({ deviceId: id, validationErrors: validationResult.error.format(), body: ctx.body }, "Device full update validation failed");
        return { error: 'Invalid input data', details: validationResult.error.format() }
      }

      const validatedData = validationResult.data

      const updatedDevice = await deviceService.updateFullDevice(id, validatedData)
      if (!updatedDevice) {
        ctx.set.status = 404
        return { error: 'Device not found' }
      }
      return updatedDevice
    } catch (error: any) {
      if (error.message === 'Device not found') {
        ctx.set.status = 404;
        logger.warn({ deviceId: id, err: error.message }, "Device not found during delete attempt");
        return { error: 'Device not found' };
      }
      // Handle specific domain validation errors thrown by the service layer
      if (error.message?.includes("Cannot update") || error.message?.includes("already exists")) {
        const statusCode = error.message.includes("already exists") ? 409 : 400;
        ctx.set.status = statusCode;
        logger.warn({ deviceId: id, body: ctx.body, err: error.message }, "Domain validation failed during full update");
        return { error: error.message };
      }

      logger.error({ err: error, deviceId: id, body: ctx.body }, "Unexpected error fully updating device");
      ctx.set.status = 500
      return { error: 'Failed to update device' }
    }
  },

  /**
   * Handles deleting a device by its ID.
   * @param ctx - The Elysia context object, expecting the device ID as a URL parameter.
   * @returns A 204 No Content response on success, or an error response (400, 404, 500).
   */
  async delete(ctx: Context<{ params: { id: string } }>) {
    let id: number | undefined;
    try {
      id = parseInt(ctx.params.id, 10)
      if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID format' }
      }

      await deviceService.deleteDevice(id)
      ctx.set.status = 204
      return { message: 'Device deleted successfully' }
    } catch (error: any) {
      if (error.message === 'Device not found') {
        ctx.set.status = 404;
        logger.warn({ deviceId: id, err: error.message }, "Device not found during delete attempt");
        return { error: 'Device not found' };
      }
      // Handle specific domain validation errors thrown by the service layer
      if (error.message?.includes("Cannot delete")) {
        ctx.set.status = 400;
        logger.warn({ deviceId: id, err: error.message }, "Domain validation failed during delete");
        return { error: error.message };
      }
      logger.error({ err: error, deviceId: id }, "Unexpected error deleting device");
      ctx.set.status = 500
      return { error: 'Failed to delete device' }
    }
  },
}