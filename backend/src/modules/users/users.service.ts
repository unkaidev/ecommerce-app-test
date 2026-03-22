import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Address, AddressType } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {}

  /**
   * Find all users — admin endpoint with pagination and optional filters.
   */
  async findAll(
    pagination: PaginationDto,
    filters: { search?: string; isActive?: boolean } = {},
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.userRepo.createQueryBuilder('user').withDeleted();

    if (filters.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: filters.isActive });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  /**
   * Find a user by ID — throws NotFoundException if not found.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  /**
   * Find a user by email — returns null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  /**
   * Toggle user account active/inactive status.
   */
  async setActiveStatus(id: string, isActive: boolean): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = isActive;
    return this.userRepo.save(user);
  }

  // ---------- Address operations ----------

  /**
   * List all addresses for a user.
   */
  async findAddresses(userId: string): Promise<Address[]> {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Create a new address for the authenticated user.
   * If isDefault is true, unset previous default for the same type.
   */
  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.unsetDefaults(userId, dto.type);
    }

    const address = this.addressRepo.create({ ...dto, userId });
    return this.addressRepo.save(address);
  }

  /**
   * Update an address — verifies ownership.
   */
  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.findAddressOrFail(addressId);
    this.assertOwnership(address, userId);

    if (dto.isDefault && dto.type) {
      await this.unsetDefaults(userId, dto.type);
    } else if (dto.isDefault && address.type) {
      await this.unsetDefaults(userId, address.type);
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  /**
   * Delete an address — verifies ownership.
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.findAddressOrFail(addressId);
    this.assertOwnership(address, userId);
    await this.addressRepo.remove(address);
  }

  /**
   * Set an address as the default for its type.
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    const address = await this.findAddressOrFail(addressId);
    this.assertOwnership(address, userId);
    await this.unsetDefaults(userId, address.type);
    address.isDefault = true;
    return this.addressRepo.save(address);
  }

  // ---------- Private helpers ----------

  private async findAddressOrFail(addressId: string): Promise<Address> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException(`Address #${addressId} not found`);
    }
    return address;
  }

  private assertOwnership(address: Address, userId: string): void {
    if (address.userId !== userId) {
      throw new ForbiddenException('You do not own this address');
    }
  }

  private async unsetDefaults(userId: string, type: AddressType): Promise<void> {
    await this.addressRepo.update(
      { userId, type, isDefault: true },
      { isDefault: false },
    );
  }
}
