import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LoginGuard implements CanActivate{
    constructor(private authService: AuthService){}

    async canActivate(context: any): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // 쿠키가 있으면 인증된 것
        if(request.cookies['login']){
            return true;
        }

        // 쿠키가 없으면 request의 body 정보 확인
        if(!request.body.email || !request.body.password){
            return false;
        }

        const user = await this.authService.validateUser(
            request.body.email,
            request.body.password,
        );

        // 유저 정보가 없으면 false 반환
        if(!user){
            return false;
        }

        request.user = user;
        return true;

    }    
}

// 로그인시 사용할 가드
@Injectable()
export class LocalAuthGuard extends AuthGuard('local'){
    async canActivate(context: any): Promise<boolean>{
        const result = (await super.canActivate(context)) as boolean;
        const request = context.switchToHttp().getRequest();
        await super.logIn(request);
        return result;
    }
}

// 인증 확인 시 사용할 가드
@Injectable()
export class AuthenticatedGuard implements CanActivate{
    canActivate(context: ExecutionContext): boolean{
        const request = context.switchToHttp().getRequest();
        return request.isAuthenticated();
    }
}


// 구글인증
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google'){
    async canActivate(context: any): Promise<boolean>{
        // 부모 클래스의 메서드 사용
        const result = (await super.canActivate(context)) as boolean;

        // 컨텍스트에서 리퀘스트 객체를 꺼냄
        const request = context.switchToHttp().getRequest();
        return result;
    }
}