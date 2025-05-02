import { db } from '../db/client'
import { devices, type Device, type NewDevice } from '../../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateDeviceInput, UpdateDeviceInput } from '../validations/deviceValidation'

export const deviceService = {
  async createDevice(data: CreateDeviceInput): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(data).returning()
    if (!newDevice) {
      throw new Error('Failed to create a new device')
    }
    return newDevice
  },

  async getAllDevices(filters: { brand?: string; state?: string }): Promise<Device[]> {
    const { brand, state } = filters
    const queryBuilder = db.select().from(devices)

    const conditions = []
    if (brand) {
      conditions.push(eq(devices.brand, brand))
    }
    if (state) {
      conditions.push(eq(devices.state, state as Device['state']))
    }

    if (conditions.length > 0) {
      queryBuilder.where(and(...conditions))
    }

    return await queryBuilder
  },

  async getDeviceById(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id))
    return device
  },

  async updateDevice(id: number, data: UpdateDeviceInput): Promise<Device | null> {
    const existingDevice = await this.getDeviceById(id)
    if (!existingDevice) {
      return null
    }

    // Domain Validation: createdAt property cannot be updated.
    if ('createdAt' in data) {
      throw new Error('Cannot update createdAt property');
  }

    // Domain Validation: Name and brand properties cannot be updated if the device is in use.
    if (existingDevice.state === 'in-use') {
      if (data.name && data.name !== existingDevice.name) {
        throw new Error("Cannot update name for a device that is 'in-use'")
      }
      if (data.brand && data.brand !== existingDevice.brand) {
        throw new Error("Cannot update brand for a device that is 'in-use'")
      }
    }

    const [updatedDevice] = await db
      .update(devices)
      .set(data)
      .where(eq(devices.id, id)) 
      .returning()

    return updatedDevice || null
  },

  async deleteDevice(id: number): Promise<boolean> {
    const existingDevice = await this.getDeviceById(id)
    if (!existingDevice) {
      return false
    }

    // Domain Validation: In use devices cannot be deleted.
    if (existingDevice.state === 'in-use') {
      throw new Error("Cannot delete a device that is 'in-use'")
    }

    const result = await db.delete(devices).where(eq(devices.id, id))
    return result.count > 0
  },
}