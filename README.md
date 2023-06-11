# 사용한 스택입니다. 공부하려는 스택이 있는지 확인해보세요
```
nestjs
typeorm(sqlite3, entity, repository) (데이터 저장)
class-validator (데이터 검증)
class-transformer (json to class 객체로 변경)
bcrypt (비밀번호 암호화에 사용)
cookie-parser (HTTP Header에서 cookie 조회)
passport (가드, 스트래티지, 시리얼라이저 사용)
express-session (세션 정보를 다룸)
```

<br><br>

# 작성 후기
다른 내용은 직관적으로 이해가 되고, 쉬운 내용이지만 

패스포트의 스트래티지파일과, 세션으로 인증하기 (어려우니 집중하세요)

위 파트는 특히나 너무 이해가 안되었습니다. 이유는 module의 imports, providers를 보지 않아서 입니다.

위의 내용을 보지 못하고 이해하려고 하다보니, 상속을 받으면 패키지에서 자동으로 설정을 해주는줄 알았습니다.

이해 못했던 내용들을 설명 드리면 auth.controller.ts의 login3이 LocalAuthGuard를 가드로 사용하는데,

이는 auth.guard.ts 파일에서 실행 됩니다.

AuthGuard('local')를 상속받고, super.canActivate(context)으로 result값을 가져 올때에 가드를 한번 더 사용하게 되는데, 이는 local.strategy.ts의 validate() 함수를 실행하게 됩니다.

여기서 의문이 들텐데,
1. 왜 local.strategy.ts를 실행 하는가?
```
auth.module 파일을 살펴보면 providers로 local.strategy 를 등록하기 떄문이다.
```
1. 왜 validate()가 기본 함수로 실행 되는가? 
```
PassportStrategy(Strategy)를 상속받을때 Strategy 클래스를 상속받게 되는데, 이는 validate() 함수를 기본으로 등록하기 때문이다.
```
1. 왜 super를 사용해야 하는가?
```
지금 생각하면 너무 간단했는데, 정리가 안되어서 이해하는데 오래 걸렸던것 같다.
상속받은 AuthGuard('local')의 생성자 메서드를 실행하기 위해서다.
```
1. 왜 session.serailizer.ts를 실행하는가?
```
auth.module 파일을 살펴보면 providers로 session.serializer 를 등록하기 떄문이다.
```

<br><br>

# CRUD 개발하기
## 1. TypeOrm - SQLite 연동
```
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite', // DB타입
      database: 'nest-auth-test.sqlite', // DB파일명
      entities: [User], // 엔티티 리스트
      synchronize: true, // DB에 스키마를 동기화 - 개발용으로만 사용한다.
      logging: true, // SQL실행로그 확인 - 개발용으로만 사용한다.
    }),
  ]
})
```

## 2. 엔티티 생성 user.entity.ts
```
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User{
    @PrimaryGeneratedColumn() // 자동증가
    id?: number; // ?은 선택 가능함

    @Column({ unique: true})
    email: string;

    @Column()
    password: string;

    @Column()
    username: string;

    @Column({ default: () => 'CURRENT_TIMESTAMP' }) // 펑션데이터를 사용하려면 람다식 써야함
    createdDt: Date;
}
```

## 3. Repository 생성 및 사용법 user.service.ts
```
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';

constructor(@InjectRepository(User) private userRepository: Repository<User>, ){}

// 유저 생성
createUser(user): Promise<User>{
    return this.userRepository.save(user);
}

// 유저 한명 검색
async getUser(email: string){
    const result = await this.userRepository.findOne({
        where: {email},
    });
    return result;
}

// 유저 정보 업데이트
async updateUser(email, _user){
    const user: User = await this.getUser(email);
    console.log(_user);
    user.username = _user.username;
    user.password = _user.password;
    console.log(user);
    this.userRepository.save(user);
}

// 유저 정보 삭제
deleteUser(email: any){
    return this.userRepository.delete({ email });
}
```

## 4. Module에 Repository를 등록해주어야 service에서 찾을 수 있습니다.
```
user.module.ts

@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
```
## 5. Entity가 등록이 되어 있어야 typeorm에서 해당 엔티티에 대한 메타 데이터를 읽을 수 있습니다.
```
app.module.ts

entities: [User], // 엔티티 리스트
```

<br><br>

# 전역 ValidationPipe 설정하기 (데이터 검증하기)
## 1. ValidationPipe 설정
```
main.ts

import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe());
```

## 2. UserDto 생성
```
user.dto.ts

import { IsEmail, IsString } from "class-validator";

export class CreateUserDto{
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    username: string;
}

export class UpdateUserDto{
    @IsString()
    username: string;

    @IsString()
    password: string;
}
```

## 3. 위에서 생성한 Dto로 검증하기 위한 소스
```
user.controller.ts

@Post('/create')
createUser(@Body() user: CreateUserDto){
    return this.userService.createUser(user);
}

@Put('/update/:email')
updateUser(@Param('email') email: string, @Body() user: UpdateUserDto){
    console.log(user);
    return this.userService.updateUser(email, user);
}
```
위 소스에서 @Body의 타입을 Dto로 설정하면 검증이 된다. 아주 편리하고 좋다.

<br><br>

# 회원가입, 비밀번호 암호화, 쿠키로 인증
## 1. 회원가입, 비밀번호 암호화
```
auth.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/user/user.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private UserService: UserService){}

    // 회원가입
    async register(userDto: CreateUserDto){
        // 이미 가입된 유저가 있는지 체크
        const user = await this.UserService.getUser(userDto.email);
        if(user){
            throw new HttpException(
                '해당 유저가 이미 있습니다.',
                HttpStatus.BAD_REQUEST,
            );
        }

        // 비밀번호 암호화
        const encryptedPassword = bcrypt.hashSync(userDto.password, 10);

        // DB에 저장
        try{
            const user = await this.UserService.createUser({
                ...userDto,
                password: encryptedPassword,
            });

            user.password = undefined;
            return user;
        }catch(error){
            throw new HttpException('서버 에러', 500);
        }

    }
}
```

## 2. CreateUserDto안의 class-validator가 자동으로 유효성 검증
```
auth.controller.ts

@Post('register')
async register(@Body() userDto: CreateUserDto){
    return await this.authService.register(userDto);
}
```

## 3. 로그인 검증하기
```
auth.service.ts

// 유저정보 검증
async validateUser(email: string, password: string){
    const user = await this.UserService.getUser(email);
    
    // 유저가 없으면 검증 실패
    if(!user){
        return null;
    }

    const { password: hashedPassword, ...userInfo} = user;
    if(bcrypt.compareSync(password, hashedPassword)){
        return userInfo;
    }
    return null;

}
```
hashedPassword는 bcrypt에서 제공하며, 암호화 된 데이터인지 검증해준다.

## 4. 로그인 및 쿠키 저장
```
auth.controller.ts

@Post('login')
async login(@Request() req, @Response() res){
    // 로그인
    const userInfo = await this.authService.validateUser(
        req.body.email,
        req.body.password,
    );

    // 쿠키 저장
    if(userInfo){
        res.cookie('login', JSON.stringify(userInfo), {
            httpOnly: false,
            maxAge: 1000 * 5,
        });
        return res.send({ message: 'login success'});
    }
}
```

<br><br>

# 가드 미들웨어로 인증하기
## 1. 쿠키를 읽기위한 설정
```
main.ts

import * as cookieParser from 'cookie-parser';

app.use(cookieParser());
```

## 2. 가드 생성
@UseGuard(<가드네임>) 으로 사용가능 하며, 인증을 위한 미들웨어 역할을 한다.

CanActiveate 인터페이스를 canActivate() 메서드로 구현하여 사용하며, boolean 또는 Promise boolean 을 반환한다.

true면 핸들러 메서드 실행

false면 403 Forbidden 을 반환한다.
```
auth.guard.ts

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
```

## 3. 컨트롤러에서 사용하기
```
auth.controller.ts

import { UseGuards } from '@nestjs/common';

@UseGuards(LoginGuard)
@Post('login2')
async login2(@Request() req, @Response() res){
    if(!req.cookies['login'] && req.user){
        res.cookie('login', JSON.stringify(req.user), {
            httpOnly: true,
            maxAge: 1000 * 5,
        });
    }

    return res.send({ message: "login2 success"});
}

@UseGuards(LoginGuard)
@Get('test-guard')
testGuard(){
    return "로그인 된 때만 이 글이 보입니다.";
}
```

<br><br>

# 패스포트의 스트래티지파일과, 세션으로 인증하기 (어려우니 집중하세요)
## 1. 패스포트와 세션 설정
```
main.ts

import * as session from 'express-session';
import * as passport from 'passport';

app.use(
  session({
    secret: 'very-important-secret', // 세션 암호화 키
    resave: false, // 세션을 항상 저장할지 여부
    saveUninitialized: false, // 세션이 저장되기 전에는 초기화 하지 않은 상태로 세션을 미리 만들어 저장
    cookie: { maxAge: 3600000 }, // 쿠키 유효기간 1시간
  }),
);

// passport 초기화 및 세션 저장소 초기화
app.use(passport.initialize());
app.use(passport.session()); // 저장소를 설정하지 않으면 메모리에 저장됨
```

## 2. 로그인용 가드와 인증용 가드 추가
```
auth.guard.ts

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from '@nestjs/passport';

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

```
위 소스의 AuthGuard('local') 은 스트레티지인데, local 은 id, pwd로 인증하는 방식이고 다른 방식(jwt, google-oauth20)도 많습니다.

위 소스를 보면 implement CanActivate 에서 extends AuthGuard('local')로 바뀐게 보이실 겁니다.

**AuthGuard는 패스포트(스트래티지) 인증에 가드를 사용할 수 있도록 감싸둔 AuthGuard 기능을 제공하는 라이브러리 입니다.**

super.canActivate(context) 는 AuthGuard를 상속을 받았기 떄문에 사용합니다.

context.switchToHttp().getRequest(); 는 해당 요청 HTTP의 객체정보를 가져오는 함수입니다. 

여기서 가져온 데이터의 쿠키로 세션에 저장, 조회 합니다.

```
아래의 세션을 저장,조회 하는기능은 main.ts에서 설정 해놓았기 때문에 사용이 가능하고,
이는 session.serializer.ts 파일에 serializeUser, deserializeUser 를 사용합니다.

super.logIn(request) 에서는 로그인 처리를 하는데, 세션을 저장합니다. 세션을 저장하고 꺼내오는건 session.serializer.ts파일에 저장합니다.

request.isAuthenticated() 함수는 세션에서 정보를 읽어옵니다.
```
<br><br>

## 3. 세션에 정보를 저장하고 읽는 세션 시리얼라이저 구현하기
```
session.serializer.ts

import { Injectable } from "@nestjs/common";
import {PassportSerializer} from '@nestjs/passport';
import { UserService } from "src/user/user.service";

@Injectable()
export class SessionSerializer extends PassportSerializer{
    constructor(private userService: UserService){
        super();
    }

    // 세션 정보 저장
    serializeUser(user: any, done: (err: Error, user: any) => void): any{
        done(null, user.email);
    }

    // 세션 정보 반환
    async deserializeUser( payload: any, done: (err: Error, payload: any) => void): Promise<any> {
        const user = await this.userService.getUser(payload);
        if (!user){
            done(new Error('No User'), null);
            return;
        }

        const { password, ...userInfo } = user;
        done(null, userInfo);
    }

    // 패스포트 인스턴스를 가져오며, 패스포트 인스턴스의 데이터가 필요한 경우 사용합니다. 본 예제에서는 사용하지 않습니다.
    getPassportInstance(): PassportStatic {
        return;
    }
}
```
세션에는 유절르 식별하는 데 사용할 최소한의 정보는 email만 저장합니다.

UserService에서 email로 유저 정보를 가져와야 하니, UserService를 주입합니다.

### serializeUser()는 세션에 정보를 저장할 때 사용합니다.
    serializeUser()에서 저장할 정보는 LocalAUthGuard의 super.logIn(request)를 호출할 때 
    내부적으로 request에 있는 user 정보를 꺼내서 전다하면서 serializeUser()를 실행합니다.


### deserializeUser()는 인증이 되었는지 세션에 있는 정보를 가지고 검증할 때 사용합니다.
    payload는 세션에서 꺼내온 값으로, 세션의 값을 확인해보려면 console.log(request.session)으로 확인이 가능 합니다.
    serializeUser()에서 email만 저장을 했기 때문에 해당 정보가 payload로 전달됩니다.
    식별하는 데 email만 있으면 되기 떄문에 userService.getUser(payload)로 유저정보를 조회합니다.

<br><br>

## 4. AuthGuard('local')에 대한 Strategy 작성하기
passport에는 local, oauth, jwt 등의 다양한 패키지가 있지만, id,pwd를 이용한 인증인 local을 사용합니다.

```
local.strategy.ts

import { Injectable } from "@nestjs/common";
import {PassportStrategy} from '@nestjs/passport';
import { Strategy } from "passport-local";
import { AuthService } from "./auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy){
    constructor(private authService: AuthService){
        // 기본값이 username이니 email로 변경
        super({ usernameField: 'email'});
    }

    async validate(email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(email, password);
        if(!user){
            return null;
        }
        return user;
    }
}
```
import문 먼저 살펴보면, passport-local을 Strategy패키지로 가져와서 local을 사용합니다.

extends PassportStrategy(Strategy) 이라는 문구가 있는데, 이는 믹스인 이라는 방법으로, 클래스의 일부만 확장하고 싶을 때 사용합니다.

local-strategy는 인증 시 사용하는 필드명이 username, password로 정해져 있기 때문에, email로 바꿔줍니다.

### validate() 메서드에서는 email,password가 올바른지 검증합니다.
    내부적으로는 email로 사용자 조회, 입력된 password를 암호화해서 조회된 password와 비교합니다. (동일하면 같음)


<br><br>

## 5. auth.module.ts에 설정 추가하기
```
auth.module.ts

import {PassportModule} from '@nestjs/passport';
import { SessionSerializer } from './session.serializer';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [UserModule, PassportModule.register({ session: true})],
  providers: [AuthService, LocalStrategy, SessionSerializer],
  controllers: [AuthController]
})
```
위 LocalStrategy와 SessionSerializer는 의존성 주입하는 코드가 없지만, 사용하려면 등록을 해야합니다.

등록하지 않으면 클래스를 찾지 못해서 에러가 발생합니다.


<br><br><br><br><br><br>


<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
