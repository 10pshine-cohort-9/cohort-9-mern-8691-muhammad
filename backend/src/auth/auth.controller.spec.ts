import { expect } from 'chai';
import * as sinon from 'sinon';
import type { Request } from 'express';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { SafeUser, UserListItem } from './auth.types.js';
import type {
  SignUpDto,
  LoginDto,
  LogoutDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './auth.dto.js';

type MockStub = sinon.SinonStub;

interface AuthServiceMock {
  signUp: MockStub;
  login: MockStub;
  refreshTokens: MockStub;
  getProfile: MockStub;
  updateProfile: MockStub;
  changePassword: MockStub;
  logout: MockStub;
  logoutAll: MockStub;
  listUsers: MockStub;
}

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: AuthServiceMock;
  let sandbox: sinon.SinonSandbox;

  const currentUser: SafeUser = {
    id: 'User786',
    email: 'user786@example.com',
    username: 'user786',
  };

  const sampleUserListItem: UserListItem = {
    id: 'User999',
    username: 'user999',
    name: 'User 999',
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    authServiceMock = {
      signUp: sandbox.stub().resolves(currentUser),
      login: sandbox.stub().resolves(currentUser),
      refreshTokens: sandbox.stub().resolves({
        user: currentUser,
        tokens: { accessToken: 'acc2', refreshToken: 'ref2' },
      }),
      getProfile: sandbox.stub().resolves(currentUser),
      updateProfile: sandbox.stub().resolves(currentUser),
      changePassword: sandbox
        .stub()
        .resolves({ message: 'Password updated successfully' }),
      logout: sandbox.stub().resolves({ message: 'Logged out successfully' }),
      logoutAll: sandbox
        .stub()
        .resolves({ message: 'Logged out from all devices' }),
      listUsers: sandbox.stub().resolves([sampleUserListItem]),
    };

    controller = new AuthController(authServiceMock as unknown as AuthService);
  });

  afterEach(() => sandbox.restore());

  it('delegates signUp api call to service function', async () => {
    const dto: SignUpDto = {
      email: 'user786@example.com',
      username: 'user786',
      password: 'Password123',
    };
    const result = await controller.signUp(dto);
    expect(authServiceMock.signUp.calledOnceWith(dto)).to.be.true;
    expect(result).to.deep.equal(currentUser);
  });

  it('delegates login api call to service function', async () => {
    const dto: LoginDto = {
      identifier: 'user786@example.com',
      password: 'Password123',
    };
    const result = await controller.login(dto);
    expect(authServiceMock.login.calledOnceWith(dto)).to.be.true;
    expect(result).to.deep.equal(currentUser);
  });

  it('delegates me api call to service function', async () => {
    const result = await controller.me(currentUser);
    expect(authServiceMock.getProfile.calledOnceWith('User786')).to.be.true;
    expect(result).to.deep.equal(currentUser);
  });

  it('delegates listUsers api call to service function', async () => {
    const result = await controller.listUsers(currentUser);
    expect(authServiceMock.listUsers.calledOnceWith('User786')).to.be.true;
    expect(result).to.deep.equal([sampleUserListItem]);
  });

  it('delegates updateProfile api call to service function', async () => {
    const dto: UpdateProfileDto = { username: 'newusername' };
    const result = await controller.updateProfile(currentUser, dto);
    expect(authServiceMock.updateProfile.calledOnceWith('User786', dto)).to.be
      .true;
    expect(result).to.deep.equal(currentUser);
  });

  it('delegates changePassword api call to service function', async () => {
    const dto: ChangePasswordDto = {
      currentPassword: 'Password123',
      newPassword: 'NewPassword123',
    };
    const result = await controller.changePassword(currentUser, dto);
    expect(authServiceMock.changePassword.calledOnceWith('User786', dto)).to.be
      .true;
    expect(result.message).to.equal('Password updated successfully');
  });

  it('delegates logout api call to service function', async () => {
    const dto: LogoutDto = { refreshToken: 'ref-token-123' };
    const mockReq = { cookies: {} } as Request;
    const result = await controller.logout(currentUser, dto, mockReq);
    expect(authServiceMock.logout.calledOnceWith('User786', 'ref-token-123')).to
      .be.true;
    expect(result.message).to.equal('Logged out successfully');
  });

  it('delegates logoutAll api call to service function', async () => {
    const result = await controller.logoutAll(currentUser);
    expect(authServiceMock.logoutAll.calledOnceWith('User786')).to.be.true;
    expect(result.message).to.equal('Logged out from all devices');
  });
});
