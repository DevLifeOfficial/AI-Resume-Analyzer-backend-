import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport/dist/auth.guard";
import { AuthService } from "./auth.service";


@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) {}

@Get('google')
@UseGuards(AuthGuard('google'))
googleAuth() {}


@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(
  @Req() req,
  @Res() res,
) {
  const result =
    await this.authService.googleLogin(
      req.user,
    );

  res.cookie(
    'access_token',
    result.token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        'production',
      sameSite: 'lax',
    },
  );

  return res.redirect("/Home");
}

}